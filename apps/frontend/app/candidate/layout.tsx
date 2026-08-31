import { AppShell } from "@/components/layout/app-shell";
import { RequireRole } from "@/components/auth/require-role";

export default function CandidateLayout({ children }: LayoutProps<"/candidate">) {
  return (
    <RequireRole role="CANDIDATE">
      <AppShell role="candidate">{children}</AppShell>
    </RequireRole>
  );
}
