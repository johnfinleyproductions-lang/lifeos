/**
 * Translating values between the app and NoCodeBackend's wire format.
 *
 * NCB sits on MariaDB, and the shapes it accepts were learned by probing the
 * live API rather than from its docs:
 *
 *   - datetimes must be "YYYY-MM-DD HH:MM:SS". An ISO string with a T or a Z
 *     is rejected outright, and fractional seconds are rounded by the server,
 *     so they are cut here instead. Everything is written and read as UTC.
 *   - dates are "YYYY-MM-DD" both ways.
 *   - booleans come back as 0 and 1.
 *   - ids are integers. The app has always treated ids as opaque strings, so
 *     they are strings on this side and numbers on that one.
 *   - JSON has no column type. It is stored as text.
 */

import type { AnyColumn } from "./table";

export class CodecError extends Error {}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** A Date as NCB wants it: UTC, to the second. */
export function toWireDateTime(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new CodecError("Invalid Date.");
  return (
    `${pad(value.getUTCFullYear(), 4)}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}` +
    ` ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`
  );
}

export function fromWireDateTime(value: string): Date {
  // "2026-11-09 20:30:00", occasionally with a T or a trailing Z or fraction.
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (!m) throw new CodecError(`Unreadable datetime from the store: ${value}`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
}

/** Drop the part of an instant the store cannot keep. */
export function truncateToSecond(value: Date): Date {
  return new Date(Math.floor(value.getTime() / 1000) * 1000);
}

const INTEGER = /^\d{1,15}$/;

/**
 * An id as the store's integer, or null when the string could never be one.
 * A stale or made-up id is not an error for a read, it simply matches nothing.
 */
export function idToWire(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && INTEGER.test(value)) return Number(value);
  return null;
}

/** App value to wire value, for writes. `null` and `undefined` become null. */
export function encode(column: AnyColumn, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  switch (column.kind) {
    case "id":
    case "ref": {
      const n = idToWire(value);
      if (n === null) {
        throw new CodecError(`${column.tableName}.${column.name}: not an id.`);
      }
      return n;
    }
    case "owner":
    case "text":
      return String(value);
    case "int": {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        throw new CodecError(`${column.tableName}.${column.name}: not a number.`);
      }
      return Math.trunc(n);
    }
    case "bool":
      return value ? 1 : 0;
    case "date": {
      const s = value instanceof Date ? toWireDateTime(value).slice(0, 10) : String(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        throw new CodecError(`${column.tableName}.${column.name}: not a day (${s}).`);
      }
      return s;
    }
    case "datetime": {
      const d = value instanceof Date ? value : new Date(value as string);
      return toWireDateTime(d);
    }
    case "json":
      return JSON.stringify(value);
  }
}

/** Wire value to app value, for reads. */
export function decode(column: AnyColumn, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  switch (column.kind) {
    case "id":
    case "ref":
      return String(value);
    case "owner":
    case "text":
      return String(value);
    case "int":
      return Number(value);
    case "bool":
      return value === true || value === 1 || value === "1";
    case "date":
      return String(value).slice(0, 10);
    case "datetime":
      return fromWireDateTime(String(value));
    case "json": {
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
  }
}

/**
 * What a value will look like after a round trip through the store. Used to
 * hand back a freshly written row without reading it again.
 */
export function normalize(column: AnyColumn, value: unknown): unknown {
  return decode(column, encode(column, value));
}
