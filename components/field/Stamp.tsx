/**
 * A rubber stamp: a heading line and a date line inside a double rule,
 * set a few degrees off square. Pressed on once the day is closed.
 *
 * `ink` is the spot colour by default, which is what a date stamp is
 * inked with. Pass "ink" for black.
 */
export function Stamp({
  title,
  line,
  ink = "spot",
  fx = true,
  className = "",
}: {
  title: string;
  line: string;
  ink?: "spot" | "ink";
  fx?: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`${title}, ${line}`}
      className={`stamp ${ink === "ink" ? "stamp-ink" : ""} ${
        fx ? "fx-stamp" : ""
      } ${className}`}
    >
      <b aria-hidden="true">{title}</b>
      <span aria-hidden="true">{line}</span>
    </span>
  );
}
