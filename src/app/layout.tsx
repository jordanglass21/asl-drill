import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Mono, IBM_Plex_Sans_Condensed } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { pageTitle } from "@/lib/site";
import "./globals.css";

// Big Shoulders is variable with an optical-size axis; large sizes get its display cut.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Sentences and notes, so they read as prose and don't compete with the mono numbers.
const plexSansCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-sans-condensed",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: pageTitle(),
  description: "Practice ASL fingerspelling with your webcam, right in the browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${plexMono.variable} ${plexSansCondensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col items-center px-4 pt-4 sm:px-6">
        <div className="flex w-full max-w-[1040px] flex-1 flex-col gap-3.5">
          <SiteHeader />
          {children}
        </div>
        {/* Cookieless visit counts in the Vercel dashboard; it never sees the camera or session data. */}
        <Analytics />
      </body>
    </html>
  );
}
