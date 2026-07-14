import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

// Figma's UI typeface is Inter — matches the reference app's chrome/panels.
const inter = Inter({
  variable: "--font-inter",
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
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
