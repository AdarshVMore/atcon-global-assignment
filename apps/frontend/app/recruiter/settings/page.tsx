"use client";

import { Mail, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth.store";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function RecruiterSettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <PageContainer title="Settings" description="Your recruiter account.">
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback className="text-base font-medium">{user ? initials(user.name) : ""}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{user?.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3.5" /> {user?.email}
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="size-3.5" /> Recruiter
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="max-w-xl text-sm text-muted-foreground">
        Name and email come from your account and aren&apos;t editable from here yet — there&apos;s no backend
        endpoint for updating a recruiter&apos;s profile.
      </p>
    </PageContainer>
  );
}
