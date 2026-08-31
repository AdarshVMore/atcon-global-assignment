"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { candidateNav, recruiterNav } from "@/lib/navigation";

interface AppShellProps {
  role: "recruiter" | "candidate";
  children: React.ReactNode;
}

export function AppShell({ role, children }: AppShellProps) {
  const nav = role === "recruiter" ? recruiterNav : candidateNav;
  const homeHref = role === "recruiter" ? "/recruiter" : "/candidate";
  const settingsHref = role === "recruiter" ? "/recruiter/settings" : "/candidate/profile";

  return (
    <SidebarProvider>
      <AppSidebar nav={nav} homeHref={homeHref} settingsHref={settingsHref} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold tracking-tight">ATCON</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
