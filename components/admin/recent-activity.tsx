import { LockKeyhole, MessageSquareText, ShieldCheck, UserPlus, WandSparkles } from "lucide-react";
import type { AdminRecentActivityItem } from "@/lib/admin/data";

const icons = [UserPlus, WandSparkles, LockKeyhole, MessageSquareText, ShieldCheck];

export function RecentActivity({ activities }: { activities: AdminRecentActivityItem[] }) {
  return (
    <section className="admin-panel">
      <header><h2>Atividades recentes</h2><p>Eventos administrativos e operacionais.</p></header>
      <div className="admin-activity-list">
        {activities.length === 0 ? <p className="admin-empty-state">Nenhuma atividade recente encontrada.</p> : null}
        {activities.map((activity, index) => {
          const Icon = icons[index] ?? ShieldCheck;
          return (
            <article key={`${activity.title}-${activity.time}`}>
              <span className={`tone-${activity.tone}`}><Icon size={17} /></span>
              <div><strong>{activity.title}</strong><small>{activity.detail}</small></div>
              <time>{activity.time}</time>
            </article>
          );
        })}
      </div>
    </section>
  );
}
