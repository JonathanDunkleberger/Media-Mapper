import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Providers from './providers';
import Link from 'next/link';
import QuickAddAutosuggest from '@/components/QuickAddAutosuggest';
import { RecommendButton, ShowTrendingButton } from '@/components/RecommendControls';
import SimpleFavorites from '@/components/SimpleFavorites';
import { ToastProvider } from '@/components/ui/ToastProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Media Mapper (Simplified)",
  description: "Simplified single-page experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-zinc-950 text-white`}>        
        <Providers>
          <ToastProvider>
          <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur border-b border-white/10">
            <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-4">
              <Link href="/" className="text-lg font-bold">Media <span className="text-indigo-400">Mapper</span></Link>
              <div className="flex items-center gap-3 flex-1 max-w-xl">
                <QuickAddAutosuggest />
                <RecommendButton />
                <ShowTrendingButton />
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-7xl flex gap-8">
            <div className="flex-1 min-w-0">{children}</div>
            <aside className="w-60 shrink-0 pt-6 pr-4 hidden md:block">
              <SimpleFavorites />
            </aside>
          </div>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
