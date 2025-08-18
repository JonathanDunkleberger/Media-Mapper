"use client";
import React from 'react';
import Link from 'next/link';
import { HomeIcon, Cog6ToothIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../context/AuthContext';

const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

export function TopNav() {
  const [showAuth, setShowAuth] = useState(false);
  const { user } = useAuth();
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
          <Link href="/my-media" aria-label="My Media" className="p-2 rounded-md hover:bg-gray-800/70 focus:outline-none focus:ring-2 focus:ring-[var(--xprime-purple)] font-semibold">
            My Media
          </Link>
          <button
            aria-label={user ? 'Profile' : 'Login'}
            className="p-2 rounded-md hover:bg-gray-800/70 focus:outline-none focus:ring-2 focus:ring-[var(--xprime-purple)]"
            onClick={() => setShowAuth(true)}
          >
            <UserCircleIcon className="h-6 w-6" />
          </button>
        </nav>
      </div>
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAuth(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <AuthModal />
            <button className="mt-4 text-xs text-gray-500 underline" onClick={() => setShowAuth(false)}>Close</button>
          </div>
        </div>
      )}
    </header>
  );
}
