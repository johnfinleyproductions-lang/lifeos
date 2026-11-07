import { redirect } from "next/navigation";

/**
 * The ideal week is retired. It was seven textareas that nothing in the
 * app ever read back, and the review's lean and the owner's was to drop
 * it rather than find it a reader. Anything saved stays in the
 * compass row's ideal_week column.
 */
export default function WeekPage() {
  redirect("/compass");
}
