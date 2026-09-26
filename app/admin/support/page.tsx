import { AlertTriangle, CheckCircle2, Clock, Lightbulb, MessageSquareText } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSummaryCard } from "@/components/admin/admin-summary-card";
import { SupportCenter } from "@/components/admin/support-center";
import { getAdminSupportData } from "@/lib/admin/support";

export default async function AdminSupportPage() {
  const { tickets, summary } = await getAdminSupportData();

  return (
    <div className="admin-page">
      <AdminHeader title="Suporte" description="Central de suporte, chamados, feedbacks, bugs, críticas e ideias dos usuários." />

      <section className="admin-summary-grid">
        <AdminSummaryCard icon={MessageSquareText} label="Novos" value={String(summary.newTickets)} description="não lidos" tone="purple" />
        <AdminSummaryCard icon={Clock} label="Abertos" value={String(summary.openTickets)} description="aguardando resposta" tone="orange" />
        <AdminSummaryCard icon={AlertTriangle} label="Urgentes" value={String(summary.urgentTickets)} description="precisam de atenção" tone="red" />
        <AdminSummaryCard icon={MessageSquareText} label="Em andamento" value={String(summary.inProgressTickets)} description="sendo tratados" tone="blue" />
        <AdminSummaryCard icon={Lightbulb} label="Planejados" value={String(summary.plannedTickets)} description="ideias em análise" tone="purple" />
        <AdminSummaryCard icon={CheckCircle2} label="Resolvidos" value={String(summary.resolvedTickets)} description="este mês" tone="green" />
      </section>

      <SupportCenter tickets={tickets} />
    </div>
  );
}
