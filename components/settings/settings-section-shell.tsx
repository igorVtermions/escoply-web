import type { LucideIcon } from "lucide-react";

export function SettingsSectionShell({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="settings-panel">
      <header className="settings-panel-header">
        <span><Icon size={22} /></span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
