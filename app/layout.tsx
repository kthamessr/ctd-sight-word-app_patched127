import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AUSUM Academic Activities",
  description:
    "AUSUM Academic Activities – an engaging, gamified sight-word intervention with ABA-inspired timing, streaks, and progress tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
