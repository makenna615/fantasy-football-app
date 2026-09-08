import Link from "next/link";
import { AuthForm } from "@/features/auth/auth-form";

export default function RegisterPage() { return <main className="grid min-h-screen place-items-center p-5"><section className="card w-full max-w-md p-7"><p className="mb-2 text-sm font-bold text-emerald-300">FOURTH DOWN</p><h1 className="text-3xl font-bold">Build your roster</h1><p className="mb-7 mt-2 muted">Create an account to save multiple teams.</p><AuthForm mode="register"/><p className="mt-5 text-center text-sm muted">Already registered? <Link className="text-emerald-300" href="/login">Sign in</Link></p></section></main> }
