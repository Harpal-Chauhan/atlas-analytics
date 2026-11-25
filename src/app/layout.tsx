import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./Provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ATLAS - Product Analytics",
    template: "%s | ATLAS",
  },
  description:
    "ATLAS is a multi-tenant product analytics platform to understand user behavior, track product performance, and make data-driven decisions.",
  applicationName: "ATLAS",
  keywords: [
    "ATLAS",
    "Product Analytics",
    "Multi-Tenant Analytics",
    "User Behavior Analytics",
    "SaaS Analytics",
  ],
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#142B27",
  colorScheme: "light",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
