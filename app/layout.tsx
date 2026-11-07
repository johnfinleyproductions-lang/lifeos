import type { Metadata } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { PressMargin } from "@/components/field/PressMargin";
import { getAuthContext } from "@/lib/auth/server-helpers";
import "./globals.css";

/**
 * Two faces. Bricolage carries every piece of chrome; Newsreader is
 * reserved for the user's own writing, so a serif on screen always means
 * words they wrote themselves.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["opsz", "wdth"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeOS",
  description:
    "A daily check-in, identity, and coaching companion. Morning manifesto, evening shutdown, quests, habits, journal — all yours.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LifeOS",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d5d6cf" },
    { media: "(prefers-color-scheme: dark)", color: "#121512" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Settles the theme before first paint so a night-mode user never sees a
 * frame of stock. Kept inline and tiny for that reason.
 */
function dayOfYear(d: Date) {
  return Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5,
  );
}

const THEME_BOOT = `(function(){try{
  var t=localStorage.getItem('lifeos-theme');
  if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'night':'day';
  document.documentElement.dataset.theme=t;
}catch(e){document.documentElement.dataset.theme='day'}})()`;

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
      data-theme="day"
      className={`${bricolage.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="bg-ink-900 text-ink-100 antialiased">
        <div className="flex flex-col md:flex-row min-h-screen">
          <Sidebar user={user} />
          <main className="flex-1 min-w-0 px-4 py-5 md:px-7 md:py-7 overflow-y-auto">
            <div className="max-w-[1080px] mx-auto">
              {children}
              <PressMargin sheet={dayOfYear(new Date())} />
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
