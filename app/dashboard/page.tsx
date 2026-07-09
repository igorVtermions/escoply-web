import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData, getTodayInSaoPaulo } from "@/lib/dashboard/data";

function getValidDate(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return getTodayInSaoPaulo();
  const parsedDate = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value ? getTodayInSaoPaulo() : value;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const selectedDate = getValidDate((await searchParams).date);
  const user = await requireUser();
  const dashboardData = await getDashboardData(user.id, selectedDate);
  return <DashboardContent data={dashboardData} selectedDate={selectedDate} />;
}
