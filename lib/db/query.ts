/**
 * The query layer the app talks to.
 *
 * LifeOS was written against a SQL database: about a hundred small queries
 * of the shape "these rows, for this person, in this order". NoCodeBackend
 * offers a REST API with a handful of filters instead. Rather than rewrite
 * every caller, this module keeps the same chained calls
 *
 *     db.select().from(habits).where(and(eq(...), gte(...))).orderBy(...)
 *
 * and carries them out over that API.
 *
 * How a read works:
 *
 *   1. The condition is planned (`plan.ts`): the parts NCB can filter on go
 *      into the URL so less comes back over the wire.
 *   2. Every row that comes back is checked to belong to the signed-in
 *      person. If one does not, the read fails. See `transport.ts` for why
 *      this is not paranoia.
 *   3. The whole condition is applied again here, in memory. So is the
 *      ordering and the limit. What NCB filtered is only ever an
 *      optimisation, never the meaning of the query.
 *
 * Writes go by id. An update or delete with a condition first reads the rows
 * it applies to, then changes exactly those.
 */

import { randomInt } from "node:crypto";
import { decode, encode, idToWire, normalize } from "./codec";
import {
  type Condition,
  type CountAggregate,
  type Ordering,
  inArray,
  matches,
  sortRows,
} from "./ops";
import { PAGE_SIZE, planRead } from "./plan";
import {
  type AnyColumn,
  type AnyTable,
  type Column,
  type TableMeta,
  metaOf,
} from "./table";

export type WireRow = Record<string, unknown>;

/** The five things the store is asked to do. `transport.ts` is the real one. */
export interface Transport {
  /** One page of rows. `params` are NCB query parameters, already planned. */
  list(
    table: string,
    params: Array<[string, string]>,
  ): Promise<{ rows: WireRow[]; hasMore: boolean }>;
  /** Insert one row and return its new id. */
  create(table: string, record: WireRow): Promise<number>;
  /** Change rows by id. Every record carries its `id`. */
  bulkUpdate(table: string, records: WireRow[]): Promise<void>;
  bulkDelete(table: string, ids: number[]): Promise<void>;
  /** The id of the signed-in person, for the ownership check. */
  ownerId(): Promise<string>;
}

/** A row came back that belongs to someone else. Never swallowed. */
export class OwnershipError extends Error {
  constructor(tableName: string) {
    super(
      `The store returned a row from ${tableName} that belongs to a different person. The read was refused.`,
    );
    this.name = "OwnershipError";
  }
}

type Row = Record<string, unknown>;
type Field = AnyColumn | CountAggregate;
type Fields = Record<string, Field>;

type FieldValue<F> = F extends CountAggregate
  ? number
  : F extends Column<infer T, infer N, boolean>
    ? N extends true
      ? T
      : T | null
    : never;

type Simplify<T> = { [K in keyof T]: T[K] } & {};
type Projected<F extends Fields> = Simplify<{
  [K in keyof F]: FieldValue<F[K]>;
}>;

const isCount = (field: Field): field is CountAggregate =>
  (field as CountAggregate).type === "count";

function project(row: Row, fields: Fields | null): Row {
  if (!fields) return row;
  const out: Row = {};
  for (const [name, field] of Object.entries(fields)) {
    if (!isCount(field)) out[name] = row[field.key];
  }
  return out;
}

function decodeRow(meta: TableMeta, wire: WireRow): Row {
  const row: Row = {};
  for (const column of meta.columns) {
    row[column.key] = decode(column, wire[column.name]);
  }
  return row;
}

/** A child table whose rows go when the parent row goes. */
type Cascade = { child: AnyTable; column: AnyColumn };

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(getTransport: () => Transport | Promise<Transport>) {
  const cascades = new Map<string, Cascade[]>();
  /**
   * A value no id will ever equal, different on every call and not
   * guessable. It makes each read URL unique, which is what stops NCB
   * serving a remembered answer, and unguessable, so nobody else can ask
   * for the same URL on purpose.
   */
  function nonce(): number {
    return randomInt(1_000_000, 2 ** 47);
  }

  async function readRows(
    t: AnyTable,
    condition: Condition | undefined,
    orderings: Ordering[],
    limit: number | null,
  ): Promise<Row[]> {
    const meta = metaOf(t);
    const plan = planRead(meta, condition, orderings, limit);
    if (plan.impossible) return [];

    const transport = await getTransport();
    const ownerId = meta.ownerKey ? await transport.ownerId() : null;

    const wireRows: WireRow[] = [];
    for (let page = 1; ; page++) {
      const { rows, hasMore } = await transport.list(
        meta.name,
        plan.paramsFor(page, nonce()),
      );
      wireRows.push(...rows);
      if (!hasMore || plan.singlePage || rows.length === 0) break;
      if (page >= 200) {
        throw new Error(`${meta.name}: more than ${200 * PAGE_SIZE} rows in one read.`);
      }
    }

    let rows = wireRows.map((wire) => decodeRow(meta, wire));
    if (meta.ownerKey) {
      for (const row of rows) {
        if (row[meta.ownerKey] !== ownerId) throw new OwnershipError(meta.name);
      }
    }
    rows = rows.filter((row) => matches(row, condition));
    rows = sortRows(rows, orderings);
    if (limit !== null) rows = rows.slice(0, limit);
    return rows;
  }

  // ─── select ───────────────────────────────────────────────────────────

  class SelectQuery<R> implements PromiseLike<R[]> {
    private condition: Condition | undefined;
    private orderings: Ordering[] = [];
    private max: number | null = null;

    private readonly t: AnyTable;
    private readonly fields: Fields | null;

    constructor(t: AnyTable, fields: Fields | null) {
      this.t = t;
      this.fields = fields;
    }

    where(condition: Condition | undefined): this {
      this.condition = condition;
      return this;
    }

    orderBy(...orderings: Array<Ordering | AnyColumn>): this {
      this.orderings = orderings.map((o) =>
        "direction" in o ? o : { column: o, direction: "asc" as const },
      );
      return this;
    }

    limit(n: number): this {
      this.max = Math.max(0, Math.floor(n));
      return this;
    }

    private async run(): Promise<R[]> {
      const counting =
        this.fields !== null && Object.values(this.fields).some(isCount);
      if (counting) {
        const rows = await readRows(this.t, this.condition, [], null);
        const out: Row = {};
        for (const [name, field] of Object.entries(this.fields!)) {
          if (isCount(field)) out[name] = rows.length;
        }
        return [out as R];
      }
      const rows = await readRows(
        this.t,
        this.condition,
        this.orderings,
        this.max,
      );
      return rows.map((row) => project(row, this.fields) as R);
    }

    then<A = R[], B = never>(
      onfulfilled?: ((value: R[]) => A | PromiseLike<A>) | null,
      onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): Promise<A | B> {
      return this.run().then(onfulfilled, onrejected);
    }
  }

  // ─── insert ───────────────────────────────────────────────────────────

  class InsertQuery<T extends AnyTable, R> implements PromiseLike<R> {
    private rows: Array<Record<string, unknown>> = [];
    private returningFields: Fields | null | undefined = undefined;

    private readonly t: T;

    constructor(t: T) {
      this.t = t;
    }

    values(
      values: T["$inferInsert"] | Array<T["$inferInsert"]>,
    ): InsertQuery<T, void> {
      this.rows = (Array.isArray(values) ? values : [values]) as Array<
        Record<string, unknown>
      >;
      return this as unknown as InsertQuery<T, void>;
    }

    returning(): InsertQuery<T, Array<T["$inferSelect"]>>;
    returning<F extends Fields>(fields: F): InsertQuery<T, Array<Projected<F>>>;
    returning(fields?: Fields): unknown {
      this.returningFields = fields ?? null;
      return this;
    }

    private async run(): Promise<R> {
      const meta = metaOf(this.t);
      const transport = await getTransport();
      const ownerId = meta.ownerKey ? await transport.ownerId() : null;
      const now = new Date();
      const written: Row[] = [];

      for (const given of this.rows) {
        const row: Row = {};
        const wire: WireRow = {};
        for (const column of meta.columns) {
          if (column.kind === "id") continue;
          let value = given[column.key];
          if (value === undefined || value === null) {
            value = column.kind === "owner" ? ownerId : column.resolveDefault(now);
          }
          if ((value === null || value === undefined) && column.isNotNull) {
            throw new Error(`${meta.name}.${column.name} is required.`);
          }
          if (column.kind === "owner" && value !== ownerId) {
            // NCB would quietly file the row under the session's person
            // anyway. Saying so beats a row that vanishes from its author.
            throw new OwnershipError(meta.name);
          }
          wire[column.name] = encode(column, value);
          row[column.key] = normalize(column, value);
        }
        const newId = await transport.create(meta.name, wire);
        row[meta.idKey] = String(newId);
        written.push(row);
      }

      if (this.returningFields === undefined) return undefined as R;
      return written.map((row) => project(row, this.returningFields!)) as R;
    }

    then<A = R, B = never>(
      onfulfilled?: ((value: R) => A | PromiseLike<A>) | null,
      onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): Promise<A | B> {
      return this.run().then(onfulfilled, onrejected);
    }
  }

  // ─── update ───────────────────────────────────────────────────────────

  class UpdateQuery<T extends AnyTable, R> implements PromiseLike<R> {
    private patch: Record<string, unknown> = {};
    private condition: Condition | undefined;
    private returningFields: Fields | null | undefined = undefined;

    private readonly t: T;

    constructor(t: T) {
      this.t = t;
    }

    set(patch: Partial<T["$inferInsert"]>): this {
      this.patch = patch as Record<string, unknown>;
      return this;
    }

    where(condition: Condition | undefined): this {
      this.condition = condition;
      return this;
    }

    returning(): UpdateQuery<T, Array<T["$inferSelect"]>>;
    returning<F extends Fields>(fields: F): UpdateQuery<T, Array<Projected<F>>>;
    returning(fields?: Fields): unknown {
      this.returningFields = fields ?? null;
      return this;
    }

    private async run(): Promise<R> {
      const meta = metaOf(this.t);
      const wirePatch: WireRow = {};
      const appPatch: Row = {};
      for (const [key, value] of Object.entries(this.patch)) {
        if (value === undefined) continue;
        const column = meta.byKey.get(key);
        if (!column) throw new Error(`${meta.name} has no column ${key}.`);
        if (column.kind === "id" || column.kind === "owner") {
          throw new Error(`${meta.name}.${column.name} cannot be changed.`);
        }
        if (value === null && column.isNotNull) {
          throw new Error(`${meta.name}.${column.name} is required.`);
        }
        wirePatch[column.name] = encode(column, value);
        appPatch[key] = normalize(column, value);
      }

      const rows = await readRows(this.t, this.condition, [], null);
      if (rows.length > 0 && Object.keys(wirePatch).length > 0) {
        const transport = await getTransport();
        for (let i = 0; i < rows.length; i += PAGE_SIZE) {
          await transport.bulkUpdate(
            meta.name,
            rows.slice(i, i + PAGE_SIZE).map((row) => ({
              id: idToWire(row[meta.idKey]),
              ...wirePatch,
            })),
          );
        }
      }

      if (this.returningFields === undefined) return undefined as R;
      return rows.map((row) =>
        project({ ...row, ...appPatch }, this.returningFields!),
      ) as R;
    }

    then<A = R, B = never>(
      onfulfilled?: ((value: R) => A | PromiseLike<A>) | null,
      onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): Promise<A | B> {
      return this.run().then(onfulfilled, onrejected);
    }
  }

  // ─── delete ───────────────────────────────────────────────────────────

  async function deleteRows(
    t: AnyTable,
    condition: Condition | undefined,
  ): Promise<Row[]> {
    const meta = metaOf(t);
    const rows = await readRows(t, condition, [], null);
    if (rows.length === 0) return rows;
    const ids = rows.map((row) => row[meta.idKey] as string);

    // Children first, so a failure half way leaves no orphans behind.
    for (const { child, column } of cascades.get(meta.name) ?? []) {
      for (let i = 0; i < ids.length; i += 100) {
        await deleteRows(
          child,
          inArray(column as Column<string>, ids.slice(i, i + 100)),
        );
      }
    }

    const transport = await getTransport();
    const wireIds = ids.map((value) => idToWire(value) as number);
    for (let i = 0; i < wireIds.length; i += PAGE_SIZE) {
      await transport.bulkDelete(meta.name, wireIds.slice(i, i + PAGE_SIZE));
    }
    return rows;
  }

  class DeleteQuery<T extends AnyTable, R> implements PromiseLike<R> {
    private condition: Condition | undefined;
    private returningFields: Fields | null | undefined = undefined;

    private readonly t: T;

    constructor(t: T) {
      this.t = t;
    }

    where(condition: Condition | undefined): this {
      this.condition = condition;
      return this;
    }

    returning(): DeleteQuery<T, Array<T["$inferSelect"]>>;
    returning<F extends Fields>(fields: F): DeleteQuery<T, Array<Projected<F>>>;
    returning(fields?: Fields): unknown {
      this.returningFields = fields ?? null;
      return this;
    }

    private async run(): Promise<R> {
      if (!this.condition) {
        throw new Error("Refusing to delete a whole table. Give a condition.");
      }
      const rows = await deleteRows(this.t, this.condition);
      if (this.returningFields === undefined) return undefined as R;
      return rows.map((row) => project(row, this.returningFields!)) as R;
    }

    then<A = R, B = never>(
      onfulfilled?: ((value: R) => A | PromiseLike<A>) | null,
      onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): Promise<A | B> {
      return this.run().then(onfulfilled, onrejected);
    }
  }

  // ─── the surface ──────────────────────────────────────────────────────

  function select(): {
    from<T extends AnyTable>(t: T): SelectQuery<T["$inferSelect"]>;
  };
  function select<F extends Fields>(
    fields: F,
  ): { from(t: AnyTable): SelectQuery<Projected<F>> };
  function select(fields?: Fields) {
    return {
      from: (t: AnyTable) => new SelectQuery<unknown>(t, fields ?? null),
    };
  }

  return {
    select,
    insert: <T extends AnyTable>(t: T) => new InsertQuery<T, void>(t),
    update: <T extends AnyTable>(t: T) => new UpdateQuery<T, void>(t),
    delete: <T extends AnyTable>(t: T) => new DeleteQuery<T, void>(t),
    /**
     * Declare that deleting a row of `parent` deletes the rows of `child`
     * that point at it. NCB has no foreign keys, so this is where the old
     * ON DELETE CASCADE lives now.
     */
    cascade(parent: AnyTable, child: AnyTable, column: AnyColumn) {
      const name = metaOf(parent).name;
      cascades.set(name, [...(cascades.get(name) ?? []), { child, column }]);
    },
  };
}
