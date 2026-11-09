/**
 * Table and column definitions for the NoCodeBackend store.
 *
 * The app describes its tables here once. The types the rest of the code
 * relies on (`$inferSelect`, `$inferInsert`) and the wire format the adapter
 * speaks are both derived from these definitions, so there is one place to
 * change when a column is added.
 *
 * What a column's kind means on the wire is in `codec.ts`.
 */

export type ColumnKind =
  /** NCB's auto-increment integer key. A string everywhere in the app. */
  | "id"
  /** An integer that points at another table's id. A string in the app. */
  | "ref"
  /** The owning user. NCB assigns it from the session and filters by it. */
  | "owner"
  | "text"
  | "int"
  | "bool"
  /** A calendar day, "YYYY-MM-DD". Never a Date, so it cannot shift zones. */
  | "date"
  /** An instant. A Date in the app, UTC to the second on the wire. */
  | "datetime"
  /** Any JSON value, stored as text. */
  | "json";

const NOW = Symbol("now");

export class Column<
  T = unknown,
  NotNull extends boolean = boolean,
  HasDefault extends boolean = boolean,
> {
  /** Type carriers only. Never read at runtime. */
  declare readonly _type: T;
  declare readonly _notNull: NotNull;
  declare readonly _hasDefault: HasDefault;

  /** The property name on the table object, e.g. `entryDate`. */
  key = "";
  /** The table this column belongs to. Set by `table()`. */
  tableName = "";
  isNotNull = false;
  hasDefault = false;
  private defaultValue: unknown = undefined;

  /** The column name in the database, e.g. `entry_date`. */
  readonly name: string;
  readonly kind: ColumnKind;

  constructor(name: string, kind: ColumnKind) {
    this.name = name;
    this.kind = kind;
  }

  notNull(): Column<T, true, HasDefault> {
    this.isNotNull = true;
    return this as unknown as Column<T, true, HasDefault>;
  }

  default(value: T): Column<T, NotNull, true> {
    this.hasDefault = true;
    this.defaultValue = value;
    return this as unknown as Column<T, NotNull, true>;
  }

  /** Filled with the current instant when a row is inserted without it. */
  defaultNow(): Column<T, NotNull, true> {
    this.hasDefault = true;
    this.defaultValue = NOW;
    return this as unknown as Column<T, NotNull, true>;
  }

  /** The value an insert should use when the caller gave none. */
  resolveDefault(now: Date): unknown {
    if (!this.hasDefault) return null;
    return this.defaultValue === NOW ? now : this.defaultValue;
  }
}

export type AnyColumn = Column<unknown, boolean, boolean>;

type Columns = Record<string, AnyColumn>;

type SelectValue<C> =
  C extends Column<infer T, infer N, boolean>
    ? N extends true
      ? T
      : T | null
    : never;

type RequiredInsertKeys<C extends Columns> = {
  [K in keyof C]: C[K] extends Column<unknown, true, false> ? K : never;
}[keyof C];

type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type InferSelect<C extends Columns> = Simplify<{
  [K in keyof C]: SelectValue<C[K]>;
}>;

export type InferInsert<C extends Columns> = Simplify<
  { [K in RequiredInsertKeys<C>]: SelectValue<C[K]> } & {
    [K in Exclude<keyof C, RequiredInsertKeys<C>>]?: SelectValue<C[K]>;
  }
>;

export const TABLE = Symbol("lifeos.table");

export type TableMeta = {
  name: string;
  columns: AnyColumn[];
  byKey: Map<string, AnyColumn>;
  idKey: string;
  ownerKey: string | null;
};

export type Table<C extends Columns = Columns> = C & {
  readonly [TABLE]: TableMeta;
  readonly $inferSelect: InferSelect<C>;
  readonly $inferInsert: InferInsert<C>;
};

/**
 * Any table at all. Spelled out rather than `Table<Columns>` because an
 * index signature over the columns would also claim `$inferSelect`.
 */
export type AnyTable = {
  readonly [TABLE]: TableMeta;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly $inferSelect: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly $inferInsert: any;
};

export function table<C extends Columns>(name: string, columns: C): Table<C> {
  const list: AnyColumn[] = [];
  const byKey = new Map<string, AnyColumn>();
  let idKey = "";
  let ownerKey: string | null = null;

  for (const [key, column] of Object.entries(columns)) {
    column.key = key;
    column.tableName = name;
    list.push(column);
    byKey.set(key, column);
    if (column.kind === "id") idKey = key;
    if (column.kind === "owner") ownerKey = key;
  }
  if (!idKey) throw new Error(`Table ${name} has no id column.`);

  const meta: TableMeta = { name, columns: list, byKey, idKey, ownerKey };
  return Object.assign(Object.create(null), columns, {
    [TABLE]: meta,
  }) as Table<C>;
}

export function metaOf(t: AnyTable): TableMeta {
  return t[TABLE];
}

// ─── Column constructors ────────────────────────────────────────────────

/** The row's own key. NCB assigns it; inserts never send one. */
export const id = () => {
  const column = new Column<string, true, true>("id", "id");
  column.isNotNull = true;
  column.hasDefault = true;
  return column;
};

/** The owning user. Always `user_id` in NCB. */
export const owner = () => new Column<string, false, false>("user_id", "owner");

/** A pointer at another table's row. */
export const ref = (name: string) =>
  new Column<string, false, false>(name, "ref");

export const text = (name: string) =>
  new Column<string, false, false>(name, "text");

export const integer = (name: string) =>
  new Column<number, false, false>(name, "int");

export const boolean = (name: string) =>
  new Column<boolean, false, false>(name, "bool");

export const date = (name: string) =>
  new Column<string, false, false>(name, "date");

export const timestamp = (name: string) =>
  new Column<Date, false, false>(name, "datetime");

export const json = (name: string) =>
  new Column<unknown, false, false>(name, "json");
