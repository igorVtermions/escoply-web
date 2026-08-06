import { CheckCircle2, Server } from "lucide-react";
import type { AdminPlatformService } from "@/lib/admin/data";

export function PlatformStatusCard({ services }: { services: AdminPlatformService[] }) {
  return (
    <section className="admin-panel">
      <header>
        <h2>Status da plataforma</h2>
        <Server size={18} />
      </header>
      <div className="admin-service-list">
        {services.map((service) => (
          <article key={service.name}>
            <span><CheckCircle2 size={17} /></span>
            <strong>{service.name}</strong>
            <em>{service.status}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
