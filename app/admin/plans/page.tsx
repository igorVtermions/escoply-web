import { AdminHeader } from "@/components/admin/admin-header";
import { PlansOverview } from "@/components/admin/plans-overview";
import { getAdminPlansData } from "@/lib/admin/plans";

export default async function AdminPlansPage() {
  const plans = await getAdminPlansData();

  return (
    <div className="admin-page">
      <AdminHeader title="Planos" description="Acompanhe planos, usuários e receita estimada com dados reais da plataforma." />
      <PlansOverview plans={plans} />
    </div>
  );
}
