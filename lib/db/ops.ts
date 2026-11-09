/**
 * Conditions, orderings and aggregates for queries.
 *
 * These build plain descriptions. Nothing here talks to the store; `query.ts`
 * decides how much of a condition NoCodeBackend can apply itself and applies
 * the whole of it again in memory, so a query means the same thing whether
 * or not the store understood all of it.
 */

import type { AnyColumn, Column } from "./table";

export type Comparison = "eq" | "ne" | "gt" | "gte" | "lt" | "lte";

export type Condition =
  | { type: "compare"; op: Comparison; column: AnyColumn; value: unknown }
  | { type: "in"; column: AnyColumn; values: unknown[] }
  | { type: "null"; column: AnyColumn; isNull: boolean }
  | { type: "like"; column: AnyColumn; pattern: string }
  | { type: "and"; parts: Condition[] }
  | { type: "or"; parts: Condition[] };

export type Ordering = { column: AnyColumn; direction: "asc" | "desc" };

export type CountAggregate = { type: "count" };

const compare =
  (op: Comparison) =>
  <T>(column: Column<T, boolean, boolean>, value: T): Condition => ({
    type: "compare",
    op,
    column: column as AnyColumn,
    value,
  });

export const eq = compare("eq");
export const ne = compare("ne");
export const gt = compare("gt");
export const gte = compare("gte");
export const lt = compare("lt");
export const lte = compare("lte");

export function inArray<T>(
  column: Column<T, boolean, boolean>,
  values: readonly T[],
): Condition {
  return { type: "in", column: column as AnyColumn, values: [...values] };
}

export function isNull(column: AnyColumn): Condition {
  return { type: "null", column, isNull: true };
}

export function isNotNull(column: AnyColumn): Condition {
  return { type: "null", column, isNull: false };
}

/** SQL LIKE: `%` is any run of characters, `_` is exactly one. */
export function like(
  column: Column<string, boolean, boolean>,
  pattern: string,
): Condition {
  return { type: "like", column: column as AnyColumn, pattern };
}

type MaybeCondition = Condition | undefined | null | false;

/** Every part must hold. Missing parts are skipped. */
export function and(...parts: MaybeCondition[]): Condition | undefined {
  const real = parts.filter(Boolean) as Condition[];
  if (real.length === 0) return undefined;
  if (real.length === 1) return real[0];
  return { type: "and", parts: real };
}

/** Any part may hold. Missing parts are skipped. */
export function or(...parts: MaybeCondition[]): Condition | undefined {
  const real = parts.filter(Boolean) as Condition[];
  if (real.length === 0) return undefined;
  if (real.length === 1) return real[0];
  return { type: "or", parts: real };
}

export function asc(column: AnyColumn): Ordering {
  return { column, direction: "asc" };
}

export function desc(column: AnyColumn): Ordering {
  return { column, direction: "desc" };
}

/** `select({ n: count() })` gives one row holding the number of matches. */
export function count(): CountAggregate {
  return { type: "count" };
}

// ─── Evaluating a condition against a row already in memory ─────────────

function comparable(value: unknown, column?: AnyColumn): number | string | null {
  if (value === null || value === undefined) return null;
  // Ids are strings in the app but they are numbers, and must order as such:
  // "9" comes before "10".
  if (column && (column.kind === "id" || column.kind === "ref")) {
    const n = Number(value);
    return Number.isFinite(n) ? n : String(value);
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  return String(value);
}

function likeToRegExp(pattern: string): RegExp {
  let out = "";
  for (const ch of pattern) {
    if (ch === "%") out += "[\\s\\S]*";
    else if (ch === "_") out += "[\\s\\S]";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

/**
 * Does this row satisfy the condition? Follows SQL where it matters: any
 * comparison against a missing value is false, including "not equal".
 */
export function matches(
  row: Record<string, unknown>,
  condition: Condition | undefined,
): boolean {
  if (!condition) return true;
  switch (condition.type) {
    case "and":
      return condition.parts.every((part) => matches(row, part));
    case "or":
      return condition.parts.some((part) => matches(row, part));
    case "null": {
      const missing = row[condition.column.key] == null;
      return condition.isNull ? missing : !missing;
    }
    case "in": {
      const left = comparable(row[condition.column.key], condition.column);
      if (left === null) return false;
      return condition.values.some(
        (value) => comparable(value, condition.column) === left,
      );
    }
    case "like": {
      const left = row[condition.column.key];
      if (typeof left !== "string") return false;
      return likeToRegExp(condition.pattern).test(left);
    }
    case "compare": {
      const left = comparable(row[condition.column.key], condition.column);
      const right = comparable(condition.value, condition.column);
      if (left === null || right === null) return false;
      switch (condition.op) {
        case "eq":
          return left === right;
        case "ne":
          return left !== right;
        case "gt":
          return left > right;
        case "gte":
          return left >= right;
        case "lt":
          return left < right;
        case "lte":
          return left <= right;
      }
    }
  }
}

/**
 * Sort rows the way Postgres did, which is what the app was written against:
 * missing values sort as larger than everything, so they come last ascending
 * and first descending.
 */
export function sortRows<R extends Record<string, unknown>>(
  rows: R[],
  orderings: Ordering[],
): R[] {
  if (orderings.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const { column, direction } of orderings) {
      const x = comparable(a[column.key], column);
      const y = comparable(b[column.key], column);
      let result: number;
      if (x === null && y === null) result = 0;
      else if (x === null) result = 1;
      else if (y === null) result = -1;
      else result = x < y ? -1 : x > y ? 1 : 0;
      if (result !== 0) return direction === "asc" ? result : -result;
    }
    return 0;
  });
}
