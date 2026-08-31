"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { clearStoredToken } from "@/lib/auth/token";
import { useAuthStore } from "@/stores/auth.store";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface UserMenuProps {
  settingsHref: string;
}

export function UserMenu({ settingsHref }: UserMenuProps) {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  function closeMobileMenu() {
    if (isMobile) setOpenMobile(false);
  }

  function handleLogOut() {
    clearStoredToken();
    setUser(null);
    closeMobileMenu();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
          >
            <Avatar size="sm" className="rounded-md">
              <AvatarFallback className="rounded-md">
                {user ? initials(user.name) : <User className="size-3.5" />}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-left">{user ? user.name : "Not signed in"}</span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{user ? user.email : "Sign in to continue"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={closeMobileMenu} render={<Link href={settingsHref} />}>
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleLogOut}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
