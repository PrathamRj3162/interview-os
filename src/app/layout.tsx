import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import { getPrefs } from "@/lib/prefs";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// next/font self-hosts these at build time: no requests go to Google at runtime.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const pixel = Pixelify_Sans({ variable: "--font-pixel", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "Interview OS — free SDE interview preparation", template: "%s · Interview OS" },
  description:
    "Resume-aware SDE interview preparation: DSA, CS fundamentals, system design, project deep-dives and mock interviews. Free.",
};

export const viewport: Viewport = { themeColor: "#0b0a12", colorScheme: "dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { theme } = await getPrefs();
  return (
    // Font variables live on <html> so theme tokens (--font-sans/--font-display, defined on :root) can resolve them.
    <html lang="en" data-theme={theme} className={`${geistSans.variable} ${geistMono.variable} ${pixel.variable}`}>
      <body className="min-h-dvh antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
