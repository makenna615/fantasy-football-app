import Link from "next/link";
import { AuthForm } from "@/features/auth/auth-form";

export default function LoginPage() { return <AuthPage title="Welcome back" note="Sign in to manage your teams."><AuthForm mode="login"/><p className="mt-5 text-center text-sm muted">New here? <Link className="text-emerald-300" href="/register">Create an account</Link></p><p className="mt-3 text-center text-sm"><Link className="text-violet-300" href="/demo">Try the demo without an account</Link></p></AuthPage> }

function AuthPage({title,note,children}:{title:string;note:string;children:React.ReactNode}) { return <main className="grid min-h-screen place-items-center p-5"><section className="card w-full max-w-md p-7"><p className="mb-2 text-sm font-bold text-emerald-300">FOURTH DOWN</p><h1 className="text-3xl font-bold">{title}</h1><p className="mb-7 mt-2 muted">{note}</p>{children}</section></main> }
