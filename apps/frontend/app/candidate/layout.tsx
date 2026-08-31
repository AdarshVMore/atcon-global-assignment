import { AppShell } from "@/components/layout/app-shell";

export default function CandidateLayout({ children }: LayoutProps<"/candidate">) {
  return <AppShell role="candidate">{children}</AppShell>;
}
