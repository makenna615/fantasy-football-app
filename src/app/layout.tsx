import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Fourth Down", description: "Fantasy football decisions, optimized." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
