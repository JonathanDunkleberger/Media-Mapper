
import dynamic from 'next/dynamic';
import React from 'react';

const GlobalMap = dynamic(
	() => import('@/components/GlobalMap'),
	{
		ssr: false,
		loading: () => <div className="w-full h-[600px] flex items-center justify-center bg-gray-900"><p>Loading Map...</p></div>
	}
);

export default function GlobalMapPage() {
	return (
		<main className="min-h-screen bg-[var(--xprime-bg)] text-[var(--xprime-text)] flex flex-col items-center py-10">
			<h1 className="text-3xl font-bold mb-8">Global Media Map</h1>
			<div className="w-full max-w-6xl h-[600px] rounded-lg shadow-lg overflow-hidden">
				<GlobalMap />
			</div>
		</main>
	);
}
