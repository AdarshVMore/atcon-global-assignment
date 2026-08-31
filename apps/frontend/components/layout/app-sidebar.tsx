"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import type { NavItem } from "@/lib/navigation";

interface AppSidebarProps {
  nav: { main: NavItem[]; footer: NavItem[] };
  homeHref: string;
  settingsHref: string;
}

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  return href !== "/recruiter" && href !== "/candidate" && pathname.startsWith(`${href}/`);
}

export function AppSidebar({ nav, homeHref, settingsHref }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileMenu() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1">
            <SidebarMenuButton size="lg" onClick={closeMobileMenu} render={<Link href={homeHref} />}>
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                A
              </span>
              <span className="truncate text-base font-semibold tracking-tight">ATCON</span>
            </SidebarMenuButton>
            <NotificationsMenu />
            <SidebarTrigger className="hidden md:flex" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.main.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isNavItemActive(pathname, item.href)}
                    tooltip={item.label}
                    onClick={closeMobileMenu}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {nav.footer.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={isNavItemActive(pathname, item.href)}
                tooltip={item.label}
                render={<Link href={item.href} />}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <UserMenu settingsHref={settingsHref} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
