import type { LucideIcon } from "lucide-react";
import { Briefcase, CalendarClock, FileText, Kanban, LayoutDashboard, Settings, UserCircle, Users } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const recruiterNav: { main: NavItem[]; footer: NavItem[] } = {
  main: [
    { label: "Overview", href: "/recruiter", icon: LayoutDashboard },
    { label: "Jobs", href: "/recruiter/jobs", icon: Briefcase },
    { label: "Candidates", href: "/recruiter/candidates", icon: Users },
    { label: "Pipeline", href: "/recruiter/pipeline", icon: Kanban },
    { label: "Interviews", href: "/recruiter/interviews", icon: CalendarClock },
  ],
  footer: [{ label: "Settings", href: "/recruiter/settings", icon: Settings }],
};

export const candidateNav: { main: NavItem[]; footer: NavItem[] } = {
  main: [
    { label: "Overview", href: "/candidate", icon: LayoutDashboard },
    { label: "Jobs", href: "/candidate/jobs", icon: Briefcase },
    { label: "Applications", href: "/candidate/applications", icon: FileText },
    { label: "Interviews", href: "/candidate/interviews", icon: CalendarClock },
  ],
  footer: [{ label: "Profile", href: "/candidate/profile", icon: UserCircle }],
};
