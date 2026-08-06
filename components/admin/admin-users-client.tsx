"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAdminUserPlanAction, updateAdminUserStatusAction } from "@/app/admin/users/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { AdminUser, UserPlan, UserStatus } from "@/types/admin";
import { UserDetailsPanel } from "./user-details-panel";
import { UsersTable } from "./users-table";

type UserFilterPlan = "all" | UserPlan;
type UserFilterStatus = "all" | UserStatus;
type PendingAdminAction =
  | { type: "plan"; user: AdminUser; nextPlan: UserPlan }
  | { type: "status"; user: AdminUser; nextStatus: UserStatus };

const planLabels: Record<UserPlan, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  ai: "AI",
};

const statusLabels: Record<UserStatus, string> = {
  active: "ativo",
  blocked: "bloqueado",
  pending: "pendente",
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function AdminUsersClient({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [localUsers, setLocalUsers] = useState(users);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<UserFilterPlan>("all");
  const [status, setStatus] = useState<UserFilterStatus>("all");
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [pendingAction, setPendingAction] = useState<PendingAdminAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim());

    return localUsers.filter((user) => {
      const searchTarget = normalizeText([user.name, user.email, user.companyName, user.profession, user.phone].filter(Boolean).join(" "));
      const matchesSearch = normalizedSearch ? searchTarget.includes(normalizedSearch) : true;
      const matchesPlan = plan === "all" ? true : user.plan === plan;
      const matchesStatus = status === "all" ? true : user.status === status;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [localUsers, plan, search, status]);

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? localUsers[0];

  function clearFilters() {
    setSearch("");
    setPlan("all");
    setStatus("all");
  }

  function patchUser(userId: string, values: Partial<Pick<AdminUser, "plan" | "status">>) {
    setLocalUsers((currentUsers) => currentUsers.map((user) => (user.id === userId ? { ...user, ...values } : user)));
  }

  function requestPlanChange(userId: string, nextPlan: UserPlan) {
    const targetUser = localUsers.find((user) => user.id === userId);
    if (!targetUser || targetUser.plan === nextPlan) return;
    setPendingAction({ type: "plan", user: targetUser, nextPlan });
  }

  function requestStatusChange(userId: string, nextStatus: UserStatus) {
    const targetUser = localUsers.find((user) => user.id === userId);
    if (!targetUser || targetUser.status === nextStatus) return;
    setPendingAction({ type: "status", user: targetUser, nextStatus });
  }

  function handlePlanChange(userId: string, nextPlan: UserPlan) {
    const previousUsers = localUsers;
    patchUser(userId, { plan: nextPlan });
    setPendingAction(null);

    startTransition(async () => {
      try {
        await updateAdminUserPlanAction(userId, nextPlan);
        showToast({ type: "success", title: "Plano atualizado", description: "O plano do usuário foi alterado." });
        router.refresh();
      } catch (error) {
        setLocalUsers(previousUsers);
        showToast({ type: "error", title: "Plano não alterado", description: error instanceof Error ? error.message : "Não foi possível alterar o plano." });
      }
    });
  }

  function handleStatusChange(userId: string, nextStatus: UserStatus) {
    const previousUsers = localUsers;
    patchUser(userId, { status: nextStatus });
    setPendingAction(null);

    startTransition(async () => {
      try {
        await updateAdminUserStatusAction(userId, nextStatus);
        showToast({
          type: "success",
          title: nextStatus === "blocked" ? "Usuário bloqueado" : "Usuário desbloqueado",
          description: nextStatus === "blocked" ? "O usuário foi banido no Auth e não consegue acessar a plataforma." : "O ban foi removido e o acesso foi liberado.",
        });
        router.refresh();
      } catch (error) {
        setLocalUsers(previousUsers);
        showToast({ type: "error", title: "Ação não concluída", description: error instanceof Error ? error.message : "Não foi possível alterar o status." });
      }
    });
  }

  function confirmPendingAction() {
    if (!pendingAction) return;

    if (pendingAction.type === "plan") {
      handlePlanChange(pendingAction.user.id, pendingAction.nextPlan);
      return;
    }

    handleStatusChange(pendingAction.user.id, pendingAction.nextStatus);
  }

  return (
    <>
      <section className="admin-filter-bar admin-user-filter-bar">
        <input
          type="search"
          placeholder="Buscar por nome, e-mail, empresa ou profissão..."
          aria-label="Buscar usuários"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select aria-label="Filtrar por plano" value={plan} onChange={(event) => setPlan(event.target.value as UserFilterPlan)}>
          <option value="all">Plano: Todos</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="ai">AI</option>
        </select>
        <select aria-label="Filtrar por status" value={status} onChange={(event) => setStatus(event.target.value as UserFilterStatus)}>
          <option value="all">Status: Todos</option>
          <option value="active">Ativo</option>
          <option value="pending">Pendente</option>
          <option value="blocked">Bloqueado</option>
        </select>
        <button type="button" className="admin-secondary-button" onClick={clearFilters}>
          Limpar filtros
        </button>
      </section>

      <section className="admin-users-layout">
        {filteredUsers.length > 0 ? (
          <UsersTable users={filteredUsers} onUserClick={(user) => setSelectedUserId(user.id)} />
        ) : (
          <div className="admin-table-card admin-empty-state">Nenhum usuário encontrado com os filtros atuais.</div>
        )}
        {selectedUser ? (
          <UserDetailsPanel user={selectedUser} isSaving={isPending} onPlanChange={requestPlanChange} onStatusChange={requestStatusChange} />
        ) : null}
      </section>

      {pendingAction ? (
        <div className="admin-modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPendingAction(null)}>
          <section className="admin-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title">
            <span>{pendingAction.type === "plan" ? "Alteração de plano" : pendingAction.nextStatus === "blocked" ? "Bloquear usuário" : "Desbloquear usuário"}</span>
            <h2 id="admin-confirm-title">
              {pendingAction.type === "plan"
                ? `Deseja mudar o plano de ${pendingAction.user.name}?`
                : pendingAction.nextStatus === "blocked"
                  ? `Deseja bloquear ${pendingAction.user.name}?`
                  : `Deseja desbloquear ${pendingAction.user.name}?`}
            </h2>
            <p>
              {pendingAction.type === "plan"
                ? `O plano atual é ${planLabels[pendingAction.user.plan]} e será alterado para ${planLabels[pendingAction.nextPlan]}.`
                : pendingAction.nextStatus === "blocked"
                  ? "O usuário não conseguirá acessar o dashboard enquanto estiver bloqueado."
                  : "O usuário voltará a conseguir acessar o dashboard."}
            </p>
            <div>
              <button type="button" onClick={() => setPendingAction(null)} disabled={isPending}>
                Cancelar
              </button>
              <button type="button" className={pendingAction.type === "status" && pendingAction.nextStatus === "blocked" ? "danger" : ""} onClick={confirmPendingAction} disabled={isPending}>
                {isPending
                  ? "Processando..."
                  : pendingAction.type === "plan"
                    ? `Mudar para ${planLabels[pendingAction.nextPlan]}`
                    : pendingAction.nextStatus === "blocked"
                      ? `Bloquear ${pendingAction.user.name.split(" ")[0]}`
                      : `Desbloquear ${pendingAction.user.name.split(" ")[0]}`}
              </button>
            </div>
            {pendingAction.type === "status" ? <small>Status atual: {statusLabels[pendingAction.user.status]}.</small> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
