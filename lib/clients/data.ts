import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClientStatus = "active" | "prospect" | "inactive";

export type ClientListItem = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  lastContactAt: string | null;
  activeProjects: number;
  logoUrl: string | null;
};

export type ClientDetails = ClientListItem & {
  website: string | null;
  whatsapp: string | null;
  notes: string | null;
  recentProjects: Array<{ id: string; name: string; status: string }>;
  reminders: Array<{ id: string; title: string; scheduledAt: string }>;
};

export type ClientsData = {
  counts: { total: number; active: number; prospects: number; inactive: number };
  clients: ClientListItem[];
  selectedClient: ClientDetails | null;
  pagination: { page: number; pageSize: number; total: number; pages: number };
};

type ClientRow = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  last_contact_at: string | null;
  logo_path: string | null;
  projects: Array<{ count: number }>;
};

type ClientDetailRow = Omit<ClientRow, "projects"> & {
  website: string | null;
  whatsapp: string | null;
  notes: string | null;
};

type ProjectRow = { id: string; name: string; status: string };
type ReminderRow = { id: string; title: string; scheduled_at: string };

function mapClient(client: ClientRow, logoUrl: string | null = null): ClientListItem {
  return {
    id: client.id,
    name: client.name,
    companyName: client.company_name,
    email: client.email,
    phone: client.phone,
    status: client.status,
    lastContactAt: client.last_contact_at,
    activeProjects: client.projects[0]?.count ?? 0,
    logoUrl,
  };
}

export async function getClientsData({
  ownerId,
  search,
  status,
  page,
  pageSize,
  selectedId,
}: {
  ownerId: string;
  search: string;
  status: ClientStatus | "all";
  page: number;
  pageSize: number;
  selectedId?: string;
}): Promise<ClientsData> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let listQuery = supabase
    .from("clients")
    .select("id, name, company_name, email, phone, status, last_contact_at, logo_path, projects(count)", { count: "exact" })
    .eq("owner_id", ownerId)
    .in("projects.status", ["in_progress", "review", "delayed"])
    .order("name")
    .range(from, to);

  if (status !== "all") listQuery = listQuery.eq("status", status);
  const safeSearch = search.trim().replace(/[,()%'"]/g, " ");
  if (safeSearch) listQuery = listQuery.or(`name.ilike.%${safeSearch}%,company_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);

  const [listResult, totalResult, activeResult, prospectsResult, inactiveResult] = await Promise.all([
    listQuery.overrideTypes<ClientRow[]>(),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "active"),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "prospect"),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "inactive"),
  ]);

  const failed = [listResult, totalResult, activeResult, prospectsResult, inactiveResult].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const clientRows = listResult.data ?? [];
  const logoPaths = clientRows.flatMap((client) => client.logo_path ? [client.logo_path] : []);
  const signedLogos = logoPaths.length > 0 ? await supabase.storage.from("client-logos").createSignedUrls(logoPaths, 60 * 60) : { data: [] };
  const logoUrls = new Map((signedLogos.data ?? []).map((logo) => [logo.path, logo.signedUrl]));
  const clients = clientRows.map((client) => mapClient(client, client.logo_path ? logoUrls.get(client.logo_path) ?? null : null));
  const detailId = selectedId ?? clients[0]?.id;
  let selectedClient: ClientDetails | null = null;

  if (detailId) {
    const clientResult = await supabase
      .from("clients")
      .select("id, name, company_name, email, phone, status, last_contact_at, logo_path, website, whatsapp, notes")
      .eq("owner_id", ownerId)
      .eq("id", detailId)
      .maybeSingle<ClientDetailRow>();

    if (clientResult.error) throw clientResult.error;

    if (clientResult.data) {
      const projectsResult = await supabase
        .from("projects")
        .select("id, name, status")
        .eq("owner_id", ownerId)
        .eq("client_id", detailId)
        .order("updated_at", { ascending: false })
        .limit(3)
        .overrideTypes<ProjectRow[]>();
      if (projectsResult.error) throw projectsResult.error;

      const projectIds = (projectsResult.data ?? []).map((project) => project.id);
      const remindersResult = projectIds.length > 0
        ? await supabase.from("reminders").select("id, title, scheduled_at").eq("owner_id", ownerId).in("project_id", projectIds).is("completed_at", null).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(3).overrideTypes<ReminderRow[]>()
        : { data: [] as ReminderRow[], error: null };
      if (remindersResult.error) throw remindersResult.error;

      const selectedLogoUrl = clientResult.data.logo_path
        ? (logoUrls.get(clientResult.data.logo_path) ?? (await supabase.storage.from("client-logos").createSignedUrl(clientResult.data.logo_path, 60 * 60)).data?.signedUrl ?? null)
        : null;
      selectedClient = {
        ...mapClient({ ...clientResult.data, projects: [{ count: projectIds.length }] }, selectedLogoUrl),
        website: clientResult.data.website,
        whatsapp: clientResult.data.whatsapp,
        notes: clientResult.data.notes,
        recentProjects: projectsResult.data ?? [],
        reminders: (remindersResult.data ?? []).map((reminder) => ({ id: reminder.id, title: reminder.title, scheduledAt: reminder.scheduled_at })),
      };
    }
  }

  const total = listResult.count ?? 0;
  return {
    counts: { total: totalResult.count ?? 0, active: activeResult.count ?? 0, prospects: prospectsResult.count ?? 0, inactive: inactiveResult.count ?? 0 },
    clients,
    selectedClient,
    pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
