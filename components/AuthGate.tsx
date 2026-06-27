"use client";

import Onboarding from "@/components/Onboarding";
import { useApp } from "@/components/AppContext";
import { SkeletonList } from "@/components/ui";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, user } = useApp();

  if (!ready) {
    return (
      <div className="sp-in py-6">
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (!user) return <Onboarding loginMode />;
  return <>{children}</>;
}
