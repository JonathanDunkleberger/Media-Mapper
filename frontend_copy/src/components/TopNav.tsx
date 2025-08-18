"use client";
import React from 'react';
import Link from 'next/link';
import { HomeIcon, Cog6ToothIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-900/90 border-b border-gray-800">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 md:px-10 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-extrabold tracking-tight text-white text-lg">Media <span className="text-[var(--xprime-purple)]">Mapper</span></Link>
        </div>
        <nav className="flex items-center gap-2 text-gray-300">
          <Link href="/" aria-label="Home" className="p-2 rounded-md hover:bg-gray-800/70 focus:outline-none focus:ring-2 focus:ring-[var(--xprime-purple)]">
            <HomeIcon className="h-5 w-5" />
          </Link>
          <Link href="/settings" aria-label="Settings" className="p-2 rounded-md hover:bg-gray-800/70 focus:outline-none focus:ring-2 focus:ring-[var(--xprime-purple)]">
            <Cog6ToothIcon className="h-5 w-5" />
          </Link>
          <Link href="/profile" aria-label="Profile" className="p-2 rounded-md hover:bg-gray-800/70 focus:outline-none focus:ring-2 focus:ring-[var(--xprime-purple)]">
            <UserCircleIcon className="h-6 w-6" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
