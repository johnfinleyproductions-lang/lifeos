import { Plate } from "./plates";

/**
 * The margin a ritual card carries: its number, engraved, its own plate,
 * and the short name of what the card is for.
 *
 * The wizards were five grey cards told apart by a line of eleven-pixel
 * type saying "Step 2 of 5". Each card now looks like itself, so the
 * place in the ritual is something you see before you read it.
 */
export function WizPlate({
  n,
  total,
  plate,
  name,
}: {
  n: number;
  total: number;
  plate: string;
  name: string;
}) {
  return (
    <div className="wiz-plate" aria-hidden="true">
      <span className="folio" data-n={n}>
        {n}
      </span>
      <span className="sm:order-none order-first">
        <Plate name={plate} size={84} className="hidden sm:block" />
        <Plate name={plate} size={40} className="sm:hidden" />
      </span>
      <span className="wiz-plate-cap">
        <b>{name}</b>
        {n} of {total}
      </span>
    </div>
  );
}
