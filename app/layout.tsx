import type { Metadata, Viewport } from "next";
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
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: "Magic Lead",
    template: "%s · Magic Lead",
  },
  description:
    "Route incoming leads to your teams round-robin, with webhooks in and out.",
  applicationName: "Magic Lead",
  // Lets iOS run the installed app chrome-free from the home screen.
  appleWebApp: {
    capable: true,
    title: "Magic Lead",
    // "default" keeps iOS reserving the status bar rather than drawing under
    // it, which avoids the sticky header colliding with the clock.
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Let content run under the notch on installed iOS; padded back via env().
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00786f" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c09" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable, montserratHeading.variable)}
    >
      {/* No overflow-x-hidden here: it would create a scroll container and
          break the dashboard's sticky header. Overflow is contained per
          component instead. */}
      <body className="flex min-h-full flex-col">
        <ConvexClientProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ConvexClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
