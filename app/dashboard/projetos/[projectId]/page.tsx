import { notFound } from "next/navigation";
import { ProjectDetailSection } from "@/components/dashboard/project-detail-section";
import { requireUser } from "@/lib/auth/session";
import { getProjectDetailData } from "@/lib/projects/detail-data";
import "../project-detail.css";

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!isValidUuid(projectId)) notFound();

  const user = await requireUser();
  const project = await getProjectDetailData({ ownerId: user.id, projectId });
  if (!project) notFound();

  return <ProjectDetailSection project={project} />;
}
