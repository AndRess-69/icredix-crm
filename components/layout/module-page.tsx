import { ComingSoon } from "@/components/layout/coming-soon";
import { PageTitle } from "@/components/layout/page-title";

interface ModulePageProps {
  title: string;
  description: string;
  phase: number;
}

export function ModulePage({ title, description, phase }: ModulePageProps) {
  return (
    <>
      <PageTitle title={title} description={description} />
      <ComingSoon module={title} phase={phase} />
    </>
  );
}
