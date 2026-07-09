import { ClientsSection } from "@/components/dashboard/clients-section";
import { requireUser } from "@/lib/auth/session";
import { getClientsData, type ClientStatus } from "@/lib/clients/data";
import "./clients.css";
import "./client-modal.css";
import "./clients-table.css";
import "./client-actions.css";

function getString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const user = await requireUser();
  const search = getString(query.busca).slice(0, 100);
  const rawStatus = getString(query.status);
  const status: ClientStatus | "all" = ["active", "prospect", "inactive"].includes(rawStatus) ? rawStatus as ClientStatus : "all";
  const requestedPage = Number.parseInt(getString(query.pagina), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const selectedId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(getString(query.cliente)) ? getString(query.cliente) : undefined;

  const clientsData = await getClientsData({ ownerId: user.id, search, status, page, pageSize: 8, selectedId });
  return <ClientsSection data={clientsData} filters={{ search, status }} />;
}
