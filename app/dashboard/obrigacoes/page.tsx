import { ObligationsPageContent } from "@/components/obligations/obligations-page-content";
import { requireUser } from "@/lib/auth/session";
import { getMonthRange, getObligationsData, getTodayInSaoPaulo } from "@/lib/obligations/data";
import "./obligations.css";

export default async function ObligacoesPage() {
  const user = await requireUser();
  const today = getTodayInSaoPaulo();
  const data = await getObligationsData({ ownerId: user.id });

  return <ObligationsPageContent data={data} today={today} referenceMonth={getMonthRange(today).start.slice(0, 7)} />;
}
