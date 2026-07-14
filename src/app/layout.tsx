import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Figma Clone",
  description: "A collaborative design editor MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to Clerk CDN for fast avatar loading */}
        <link rel="preconnect" href="https://img.clerk.com" />
        <link rel="dns-prefetch" href="https://img.clerk.com" />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <ClerkProvider afterSignOutUrl="/sign-in">{children}</ClerkProvider>
      </body>
    </html>
  );
}
