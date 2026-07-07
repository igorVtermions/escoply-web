import { ProjectsSection } from "@/components/dashboard/projects-section";
import { requireUser } from "@/lib/auth/session";
import { getProjectsData, type ProjectSort, type ProjectStatus } from "@/lib/projects/data";
import "./projects.css";

function getString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const user = await requireUser();
  const search = getString(query.busca).slice(0, 100);
  const rawStatus = getString(query.status);
  const status: ProjectStatus | "all" = ["in_progress", "review", "completed", "delayed", "archived"].includes(rawStatus) ? rawStatus as ProjectStatus : "all";
  const rawClientId = getString(query.cliente);
  const clientId = isValidUuid(rawClientId) ? rawClientId : "all";
  const rawSort = getString(query.ordem);
  const sort: ProjectSort = ["recent", "deadline", "value_desc", "progress_desc", "name"].includes(rawSort) ? rawSort as ProjectSort : "recent";
  const requestedPage = Number.parseInt(getString(query.pagina), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const projectsData = await getProjectsData({ ownerId: user.id, search, status, clientId, sort, page, pageSize: 6 });
  return <ProjectsSection data={projectsData} filters={{ search, status, clientId, sort }} />;
}
