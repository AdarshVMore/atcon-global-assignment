import { AppShell } from "@/components/layout/app-shell";

export default function RecruiterLayout({ children }: LayoutProps<"/recruiter">) {
  return <AppShell role="recruiter">{children}</AppShell>;
}
