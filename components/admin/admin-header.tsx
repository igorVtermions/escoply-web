import { AdminHeaderActions } from "./admin-header-actions";
import { getAdminNotifications } from "@/lib/admin/notifications";

export async function AdminHeader({ title, description }: { title: string; description: string }) {
  const notifications = await getAdminNotifications();

  return (
    <header className="admin-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <AdminHeaderActions notifications={notifications} />
    </header>
  );
}
