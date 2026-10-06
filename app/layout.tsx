import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AppwriteBoot } from "@/components/AppwriteBoot";

export const metadata: Metadata = {
  title: "NCC Escape Challenge — NITER Computer Club",
  description:
    "A timed mission. 4 challenges. 1 escape. Complete the mission to win a prize at the NITER Computer Club (NCCC) stall.",
  openGraph: {
    title: "NCC Escape Challenge",
    description: "Complete the mission. Win the prize. NITER Computer Club.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppwriteBoot />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}