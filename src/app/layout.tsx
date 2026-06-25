import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
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
  metadataBase: new URL(
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Grsshppr",
    template: "%s · Grsshppr",
  },
  description: "Free, open-source mentoring platform for tech & design professionals",
  openGraph: {
    title: "Grsshppr",
    description: "Free, open-source mentoring for tech & design professionals",
    siteName: "Grsshppr",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grsshppr",
    description: "Free, open-source mentoring for tech & design professionals",
  },
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
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
