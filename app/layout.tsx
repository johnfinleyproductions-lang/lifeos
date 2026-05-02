import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { getAuthContext } from "@/lib/auth/server-helpers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeOS",
  description: "A daily check-in companion + identity + insight system.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read session at layout-level. Server Components nested below can call
  // getAuthContext() again — getSession is cached per-request.
  const { user } = await getAuthContext();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <body className="bg-ink-950 text-ink-100 antialiased">
        <div className="flex min-h-screen">
          <Sidebar user={user} />
          <main className="flex-1 px-8 py-8 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
