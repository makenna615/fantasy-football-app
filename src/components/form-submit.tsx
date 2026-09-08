"use client";

import { useFormStatus } from "react-dom";

export function FormSubmit({ children, pending = "Saving…", className = "button-primary" }: { children: React.ReactNode; pending?: string; className?: string }) {
  const status = useFormStatus();
  return <button className={className} disabled={status.pending}>{status.pending ? pending : children}</button>;
}
