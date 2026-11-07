import { redirect } from "next/navigation";

/**
 * Discipline folded into Insights. The seven-day scorecard is the top
 * of that page, the balance and the year grid moved with it. The route
 * stays so old links and the habit of typing it still land somewhere.
 */
export default function DisciplinePage() {
  redirect("/insights?window=7");
}
