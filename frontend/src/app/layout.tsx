import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "../context/AuthContext";
import Providers from './providers';
import Link from 'next/link';
import SearchAndAddAutosuggest from '@/components/SearchAndAddAutosuggest';
import { FavoritesSyncOnSignIn } from '@/components/FavoritesSyncOnSignIn';
import FavoritesHydrateOnSignIn from '@/components/FavoritesHydrateOnSignIn';
import { ToastProvider } from '@/components/ui/ToastProvider';
import HeaderActions from '@/components/HeaderActions';

export const metadata: Metadata = {
  title: "Media Mapper - The Snappy Recommender",
  description: "Find your next favorite movie, game, show, or book instantly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-zinc-950 text-white font-sans">
        <Providers>
        <AuthProvider>
          <ToastProvider>
          <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur border-b border-white/10">
            <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-4">
              <Link href="/" className="text-lg font-bold">Media <span className="text-indigo-400">Mapper</span></Link>
              <div className="flex items-center gap-3 flex-1 max-w-xl">
                <SearchAndAddAutosuggest />
              </div>
              <HeaderActions />
            </div>
          </header>
          <FavoritesSyncOnSignIn />
          <FavoritesHydrateOnSignIn />
          {children}
          </ToastProvider>
        </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
