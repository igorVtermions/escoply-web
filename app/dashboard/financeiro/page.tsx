import { FinancePageContent } from "@/components/finance/finance-page-content";
import { requireUser } from "@/lib/auth/session";
import { getFinanceData, getTodayInSaoPaulo } from "@/lib/finance/data";
import "./finance.css";

export default async function FinanceiroPage() {
  const user = await requireUser();
  const data = await getFinanceData({ ownerId: user.id });

  return <FinancePageContent data={data} today={getTodayInSaoPaulo()} />;
}
