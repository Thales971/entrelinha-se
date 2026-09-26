import { createContext, useContext, type ReactNode } from "react";
import type { PostKind } from "@/lib/entrelinhas/model";

export type DeskApi = {
  tick: number;
  meId: string;
  refresh: () => void;
  openPost: (id: string) => void;
  openUser: (userId: string) => void;
  openCompose: (mode: "post" | "story", kind?: PostKind) => void;
  openStory: (userId: string) => void;
  openChat: (conversationId: string, title: string) => void;
};

const DeskContext = createContext<DeskApi | null>(null);

export function DeskProvider({ value, children }: { value: DeskApi; children: ReactNode }) {
  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const value = useContext(DeskContext);
  if (!value) throw new Error("Fora do caderno");
  return value;
}
