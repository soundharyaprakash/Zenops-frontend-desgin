import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { CMDBProvider } from "@/context/cmdb-context";
import { AppLayout } from "@/components/layout/AppLayout";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "ZenOps",
  description: "Enterprise Configuration Management Database with Real-time Dependency Topology, Attestation, and Data Quality Assurance.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/zenops-mark.svg", type: "image/svg+xml" },
    ],
    apple: "/brand/zenops-mark.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-app text-default antialiased min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <CMDBProvider>
            <AppLayout>{children}</AppLayout>
          </CMDBProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
