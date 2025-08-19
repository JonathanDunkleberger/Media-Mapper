"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// No backendBase needed; use /api endpoints directly

type MapMovie = {
  id: number;
  title: string;
  poster: string | null;
  country: string;
  coords: { lat: number; lng: number } | null;
};

export default function GlobalMap() {
  const [movies, setMovies] = useState<MapMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Removed broken/duplicate useEffect and backendBase usage
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/global-map-movies', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch map data');
        const data = await res.json();
        setMovies(Array.isArray(data.movies) ? data.movies : []);
      } catch (e) {
        if (e instanceof Error) {
          if (e.name === 'AbortError') return;
          setError(e.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      controller.abort();
    };
  }, []);

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
    <>
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
    </>
  );
}
