import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Worship Companion | Music Lab", description: "A church music-learning and worship songbook workspace." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
