import { AppShell } from "@/components/layout/app-shell";
import { RequireRole } from "@/components/auth/require-role";

export default function RecruiterLayout({ children }: LayoutProps<"/recruiter">) {
  return (
    <RequireRole role="RECRUITER">
      <AppShell role="recruiter">{children}</AppShell>
    </RequireRole>
  );
}
