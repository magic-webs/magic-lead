import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const montserratHeading = Montserrat({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: "Magic Lead",
    template: "%s · Magic Lead",
  },
  description:
    "Route incoming leads to your teams round-robin, with webhooks in and out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable, montserratHeading.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
