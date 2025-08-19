"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "react-error-boundary";
import type { ReactNode } from "react";

const GlobalMap = dynamic(() => import("@/components/GlobalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-gray-900">
      <p>Loading Map...</p>
    </div>
  ),
});

function MapErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="w-full h-[600px] flex flex-col items-center justify-center bg-red-900 text-white">
      <p>Map failed to load: {error.message}</p>
      <button className="mt-4 px-4 py-2 bg-white text-red-900 rounded" onClick={resetErrorBoundary}>
        Try Again
      </button>
    </div>
  );
}

export interface GlobalMapClientWrapperProps {
  children?: ReactNode;
}

export default function GlobalMapClientWrapper({}: GlobalMapClientWrapperProps) {
  return (
    <ErrorBoundary FallbackComponent={MapErrorFallback}>
      <GlobalMap />
    </ErrorBoundary>
  );
}
