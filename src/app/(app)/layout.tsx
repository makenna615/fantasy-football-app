import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { logout } from "@/features/auth/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <><header className="flex items-center justify-between border-b border-[#202a38] bg-[#090e16] px-5 py-4"><Link href="/teams" className="flex items-center gap-2 font-bold"><span className="grid size-8 place-items-center rounded-lg bg-emerald-400 text-slate-950"><Shield size={17}/></span>Fourth Down</Link><div className="flex items-center gap-4 text-sm"><span className="muted">{user.name}</span><form action={logout}><button aria-label="Sign out" className="muted"><LogOut size={18}/></button></form></div></header>{children}</>;
}
