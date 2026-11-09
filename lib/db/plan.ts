/**
 * Deciding what to ask NoCodeBackend for.
 *
 * NCB filters with query parameters: `col=v`, `col[gte]=v`, `col[in]=a,b`
 * and so on. This turns as much of a condition as is safe into those
 * parameters. Whatever it leaves out is still applied afterwards in
 * `query.ts`, so the only cost of leaving something out is a bigger response.
 *
 * "Safe" means the store would never drop a row the app's own check would
 * keep. Where MariaDB and the app could disagree, the filter stays at home:
 *
 *   - text is compared case-insensitively over there, so "not equal" on text
 *     could hide rows; only "equal" is sent, and it is treated as a wider
 *     net than the real test.
 *   - instants are stored to the second, so a bound with milliseconds is
 *     rounded outward before it is sent.
 *   - there is no parameter for "is null".
 *   - one parameter cannot carry both `col=` and `col[op]=`; NCB answers
 *     that with a SQL error.
 *
 * `exact` records whether the parameters alone say everything the condition
 * says. Only then can the store also be trusted to sort and cut the list
 * (`singlePage`), which is what keeps "latest entry" from fetching them all.
 */

import { idToWire, toWireDateTime, truncateToSecond } from "./codec";
import type { Comparison, Condition, Ordering } from "./ops";
import type { AnyColumn, TableMeta } from "./table";

/** NCB caps a page at 500 rows whatever is asked for. */
export const PAGE_SIZE = 500;

export type ReadPlan = {
  /** The condition can match nothing. No request is needed. */
  impossible: boolean;
  /** The store sorts and limits; one page is the whole answer. */
  singlePage: boolean;
  paramsFor(page: number, nonce: number): Array<[string, string]>;
};

/** Text that is safe to put in a filter value and means what it says. */
const PLAIN_TEXT = /^[A-Za-z0-9_.:@+/ -]{1,190}$/;

const BRACKET: Record<Exclude<Comparison, "eq">, string> = {
  ne: "ne",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
};

function flatten(condition: Condition | undefined): {
  leaves: Condition[];
  hasOr: boolean;
} {
  if (!condition) return { leaves: [], hasOr: false };
  if (condition.type === "and") {
    const leaves: Condition[] = [];
    let hasOr = false;
    for (const part of condition.parts) {
      const inner = flatten(part);
      leaves.push(...inner.leaves);
      hasOr = hasOr || inner.hasOr;
    }
    return { leaves, hasOr };
  }
  if (condition.type === "or") return { leaves: [], hasOr: true };
  return { leaves: [condition], hasOr: false };
}

/** A single value as a filter string, or null when it should not be sent. */
function wireScalar(column: AnyColumn, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  switch (column.kind) {
    case "ref": {
      const n = idToWire(value);
      return n === null ? null : String(n);
    }
    case "int":
      return typeof value === "number" && Number.isFinite(value)
        ? String(Math.trunc(value))
        : null;
    case "bool":
      return value ? "1" : "0";
    case "date":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? value
        : null;
    case "text":
      return typeof value === "string" && PLAIN_TEXT.test(value) ? value : null;
    default:
      return null;
  }
}

export function planRead(
  meta: TableMeta,
  condition: Condition | undefined,
  orderings: Ordering[],
  limit: number | null,
): ReadPlan {
  const { leaves, hasOr } = flatten(condition);
  const filters: Array<[string, string]> = [];
  const taken = new Map<string, Set<string>>();
  let exact = !hasOr;
  let impossible = limit === 0;
  let idFilter: number[] | null = null;

  /** Reserve `column` + `op`. False when NCB could not take both. */
  const claim = (column: AnyColumn, op: string): boolean => {
    const ops = taken.get(column.name) ?? new Set<string>();
    const clash = ops.has(op) || (op === "eq" ? ops.size > 0 : ops.has("eq"));
    if (clash) return false;
    ops.add(op);
    taken.set(column.name, ops);
    return true;
  };

  for (const leaf of leaves) {
    if (leaf.type === "null" || leaf.type === "like") {
      exact = false;
      continue;
    }
    if (leaf.type === "and" || leaf.type === "or") continue;
    const column = leaf.column;

    // The store already limits every read to the signed-in person, and
    // query.ts checks that it did. Nothing to send.
    if (column.kind === "owner") continue;

    if (column.kind === "json") {
      exact = false;
      continue;
    }

    if (leaf.type === "in") {
      if (leaf.values.length === 0) {
        impossible = true;
        continue;
      }
      if (column.kind === "id") {
        const ids = leaf.values.map(idToWire).filter((n): n is number => n !== null);
        if (ids.length === 0) impossible = true;
        else if (idFilter === null) idFilter = ids;
        else exact = false;
        continue;
      }
      const parts = leaf.values.map((value) => wireScalar(column, value));
      const sendable =
        column.kind !== "bool" &&
        parts.every((part): part is string => part !== null && !part.includes(","));
      if (sendable && claim(column, "in")) {
        filters.push([`${column.name}[in]`, parts.join(",")]);
        if (column.kind === "text") exact = false;
      } else if (column.kind === "ref" && parts.every((part) => part === null)) {
        impossible = true;
      } else {
        exact = false;
      }
      continue;
    }

    // leaf.type === "compare"
    const { op, value } = leaf;
    if (value === null || value === undefined) {
      // SQL: any comparison with NULL is false.
      impossible = true;
      continue;
    }

    if (column.kind === "id") {
      const n = idToWire(value);
      if (op === "eq") {
        if (n === null) impossible = true;
        else if (idFilter === null) idFilter = [n];
        else exact = false;
      } else {
        exact = false;
      }
      continue;
    }

    if (column.kind === "datetime") {
      if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        exact = false;
        continue;
      }
      const whole = value.getTime() % 1000 === 0;
      const floor = toWireDateTime(truncateToSecond(value));
      if (op === "eq") {
        if (!whole) impossible = true;
        else if (claim(column, "eq")) filters.push([column.name, floor]);
        else exact = false;
      } else if (op === "ne") {
        exact = false;
      } else {
        // Stored instants have no milliseconds, so rounding the bound down
        // and making the comparison inclusive can only let extra rows in.
        const lower = op === "gt" || op === "gte";
        const key = lower ? "gte" : "lte";
        if (claim(column, key)) filters.push([`${column.name}[${key}]`, floor]);
        else exact = false;
        if (!(whole && op === key)) exact = false;
      }
      continue;
    }

    const scalar = wireScalar(column, value);
    if (scalar === null) {
      if (column.kind === "ref" && op === "eq") impossible = true;
      else exact = false;
      continue;
    }

    if (column.kind === "text") {
      // Equality only, and only as a wider net: MariaDB ignores case.
      if (op === "eq" && claim(column, "eq")) filters.push([column.name, scalar]);
      exact = false;
      continue;
    }

    if (column.kind === "bool" && op !== "eq" && op !== "ne") {
      exact = false;
      continue;
    }

    if (op === "eq") {
      if (claim(column, "eq")) filters.push([column.name, scalar]);
      else exact = false;
    } else if (claim(column, BRACKET[op])) {
      filters.push([`${column.name}[${BRACKET[op]}]`, scalar]);
    } else {
      exact = false;
    }
  }

  // Let the store sort and cut the list only when it would pick exactly the
  // rows the app would. MariaDB puts missing values first where Postgres put
  // them last, so a sort on a column that can be empty stays at home.
  const order = orderings[0];
  const sortable =
    orderings.length === 0 ||
    (orderings.length === 1 && (order.column.isNotNull || order.column.kind === "id"));
  const singlePage =
    exact && limit !== null && limit > 0 && limit <= PAGE_SIZE && sortable;

  return {
    impossible,
    singlePage,
    paramsFor(page, nonce) {
      const params: Array<[string, string]> = [...filters];
      // The nonce rides on the id column: a negative id matches no row, so
      // "not this one" and "one of these, or this one" change nothing except
      // the URL. See transport.ts for what that buys.
      if (idFilter !== null) params.push(["id[in]", `${idFilter.join(",")},-${nonce}`]);
      else params.push(["id[ne]", `-${nonce}`]);

      if (singlePage) {
        if (order) {
          params.push(["sort", order.column.name], ["order", order.direction]);
        }
        params.push(["page", "1"], ["limit", String(limit)]);
      } else {
        params.push(["sort", "id"], ["order", "asc"]);
        params.push(["page", String(page)], ["limit", String(PAGE_SIZE)]);
      }
      return params;
    },
  };
}
