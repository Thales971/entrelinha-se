import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Boot, LoginPanel } from "@/components/entrelinhas/login-panel";
import { Shell } from "@/components/entrelinhas/shell";
import { LangProvider } from "@/lib/entrelinhas/i18n";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mounted, setMounted] = useState(false);
  const { user, isPending } = useCurrentUserState();
  useEffect(() => setMounted(true), []);

  return (
    <LangProvider>
      <main className="desk">
        <div className="phone">
          {!mounted || isPending ? <Boot /> : user ? <Shell user={user} /> : <LoginPanel />}
        </div>
      </main>
    </LangProvider>
  );
}
