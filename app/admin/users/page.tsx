import { AdminHeader } from "@/components/admin/admin-header";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { getAdminUsersData } from "@/lib/admin/data";

export default async function AdminUsersPage() {
  const users = await getAdminUsersData();

  return (
    <div className="admin-page">
      <AdminHeader title="Usuários" description="Gerencie usuários reais do Supabase Auth e os dados vinculados aos perfis." />
      <AdminUsersClient users={users} />
    </div>
  );
}
