import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Header, BottomNav } from "@/components/nav";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "IFGF Rides", template: "%s · IFGF Rides" },
  description: "Find a ride to Sunday service at IFGF Bay Area, or offer one.",
  appleWebApp: { capable: true, title: "IFGF Rides", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-5">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
