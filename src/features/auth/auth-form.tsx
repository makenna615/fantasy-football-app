"use client";

import { useActionState } from "react";
import { FormSubmit } from "@/components/form-submit";
import { login, register, type AuthState } from "./actions";

const initialState: AuthState = {};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action] = useActionState(mode === "login" ? login : register, initialState);
  return <form action={action} className="space-y-4">
    {mode === "register" && <label className="field">Name<input name="name" autoComplete="name" required minLength={2}/></label>}
    <label className="field">Email<input name="email" type="email" autoComplete="email" required/></label>
    <label className="field">Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required/></label>
    {state.error && <p role="alert" className="rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{state.error}</p>}
    <FormSubmit className="button-primary w-full" pending={mode === "login" ? "Signing in…" : "Creating account…"}>{mode === "login" ? "Sign in" : "Create account"}</FormSubmit>
  </form>;
}
