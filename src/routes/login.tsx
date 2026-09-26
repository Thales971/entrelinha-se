import { useEffect, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Boot, LoginPanel } from "@/components/entrelinhas/login-panel";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const { user, isPending } = useCurrentUserState();
  useEffect(() => setMounted(true), []);
  if (!mounted || isPending) {
    return (
      <main className="desk">
        <div className="phone"><Boot /></div>
      </main>
    );
  }
  if (user) return <Navigate to="/" />;
  return (
    <main className="desk">
      <div className="phone"><LoginPanel /></div>
    </main>
  );
}
