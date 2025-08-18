"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

type MapMovie = {
  id: number;
  title: string;
  poster: string | null;
  country: string;
  coords: { lat: number; lng: number } | null;
};

export default function GlobalMapView() {
  const [movies, setMovies] = useState<MapMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${backendBase}/api/global-map-movies`);
        if (!res.ok) throw new Error('Failed to fetch map data');
        const data = await res.json();
        setMovies(Array.isArray(data.movies) ? data.movies : []);
      } catch (e: any) {
        setError(e?.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Custom icon for movie poster
  function posterIcon(url: string) {
    return L.icon({
      iconUrl: url,
      iconSize: [60, 90],
      iconAnchor: [30, 90],
      popupAnchor: [0, -90],
      tooltipAnchor: [30, -10],
      className: 'leaflet-movie-poster-icon',
    });
  }

  return (
    <main className="min-h-screen bg-[var(--xprime-bg)] text-[var(--xprime-text)] flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">Global Media Map</h1>
      <div className="w-full max-w-6xl h-[600px] bg-gray-900 rounded-lg shadow-lg flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="text-gray-400">Loading interactive map...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <MapContainer center={[20, 0]} zoom={2} style={{ height: 600, width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {movies.map((movie) => (
              movie.coords && movie.poster ? (
                <Marker
                  key={movie.country + '-' + movie.id}
                  position={[movie.coords.lat, movie.coords.lng]}
                  icon={posterIcon(movie.poster)}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                    <span className="font-bold text-xs">{movie.title}</span>
                  </Tooltip>
                </Marker>
              ) : null
            ))}
          </MapContainer>
        )}
      </div>
    </main>
  );
}
