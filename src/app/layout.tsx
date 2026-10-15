import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import BackgroundDecorations from "@/components/BackgroundDecorations";
import GlobalHoverAnimation from "@/components/GlobalHoverAnimation";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "DermaAgent — Your Personal AI Lesion Screening Agent",
  description:
    "Upload a photo of a skin lesion and get a top-three match across eight ISIC 2019 lesion classes, with severity guidance. DermaAgent pairs an AI screening model with a skin-cancer risk assessment, ABCDE self-check, and conversational clinical agent.",
  keywords: [
    "skin cancer detection",
    "skin lesion classification",
    "dermatology AI",
    "DermaAgent",
    "melanoma screening",
    "ISIC 2019",
    "ABCDE rule",
    "smart dermatology",
  ],
  openGraph: {
    title: "DermaAgent — Your Personal AI Lesion Screening Agent",
    description: "Eight-class lesion screening, risk assessment, ABCDE self-check, and conversational clinical agent.",
    type: "website",
  },
};

// prevent theme flash
const themeInit = `(function(){try{var t=localStorage.getItem('helix-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="relative min-h-screen antialiased">
        <GlobalHoverAnimation />
        <BackgroundDecorations />
        <svg className="absolute w-0 h-0" aria-hidden="true">
          <defs>

            <linearGradient id="grad-normal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            <linearGradient id="grad-hover" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            {/*
              The old #water-refraction filter (feTurbulence + feDisplacementMap)
              was removed: it forced every GlassOrb and glass-droplet onto an
              expensive offscreen buffer and was the main cause of scroll jank.
            */}
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
