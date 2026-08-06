import { AdminHeader } from "@/components/admin/admin-header";
import { getAdminPlanDefinitions } from "@/lib/admin/plans";

export default async function AdminSettingsPage() {
  const plans = await getAdminPlanDefinitions();

  return (
    <div className="admin-page">
      <AdminHeader title="Configurações Admin" description="Gerencie configurações internas da plataforma Escoply." />
      <p className="admin-admin-note">
        TODO: mover ações sensíveis para API segura com service role. Esta tela é mockada e não altera configurações reais.
      </p>
      <section className="admin-settings-grid">
        <article className="admin-settings-card">
          <h2>Dados da plataforma</h2>
          <p>Informações básicas do SaaS.</p>
          <dl>
            <div><dt>Nome do app</dt><dd>Escoply</dd></div>
            <div><dt>Versão</dt><dd>0.1.0</dd></div>
            <div><dt>E-mail de suporte</dt><dd>igorviniciusf10@gmail.com</dd></div>
            <div><dt>Ambiente</dt><dd>Desenvolvimento</dd></div>
          </dl>
        </article>
        <article className="admin-settings-card">
          <h2>Segurança</h2>
          <p>Regras planejadas para autenticação e proteção.</p>
          <ul>
            <li><span>Permitir cadastro público</span><strong>Ativo</strong></li>
            <li><span>Exigir e-mail verificado</span><strong>Futuro</strong></li>
            <li><span>Bloquear usuários suspeitos</span><strong>Futuro</strong></li>
          </ul>
        </article>
        <article className="admin-settings-card">
          <h2>Feature flags</h2>
          <p>Recursos planejados para ativação progressiva.</p>
          <ul>
            <li><span>PDFs</span><strong>Em breve</strong></li>
            <li><span>IA/RAG</span><strong>Roadmap futuro</strong></li>
            <li><span>Notificações</span><strong>Em breve</strong></li>
            <li><span>Integração WhatsApp</span><strong>Em breve</strong></li>
          </ul>
        </article>
        <article className="admin-settings-card">
          <h2>Manutenção</h2>
          <p>Status operacional mockado.</p>
          <ul>
            <li><span>Status da plataforma</span><strong>Online</strong></li>
            <li><span>Modo manutenção</span><strong>Desativado</strong></li>
            <li><span>Mensagem global</span><strong>Futura</strong></li>
          </ul>
        </article>
      </section>
      <section className="admin-settings-card">
        <h2>Limites padrão dos planos</h2>
        <ul>
          {plans.map((plan) => (
            <li key={plan.plan}>
              <span>{plan.name}</span>
              <strong>{plan.clientsLimit === "unlimited" ? "Clientes ilimitados" : `${plan.clientsLimit} clientes`} · {plan.projectsLimit === "unlimited" ? "Projetos ilimitados" : `${plan.projectsLimit} projetos`} · {plan.storageLimit}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
