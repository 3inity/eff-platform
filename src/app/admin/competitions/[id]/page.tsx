import { CompetitionsManagementView } from "@/components/CompetitionsManagementView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminCompetitionDetailPage({ params }: Props) {
  const { id } = await params;
  return <CompetitionsManagementView initialCompId={id} />;
}
