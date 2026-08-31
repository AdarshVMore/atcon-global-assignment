"use client";

import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth.store";

export default function RecruiterSettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <PageContainer title="Settings">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={user?.name ?? ""} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Input value={user?.role ?? ""} disabled />
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
