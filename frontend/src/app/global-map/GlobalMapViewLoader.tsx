"use client";

import dynamic from 'next/dynamic';

const GlobalMapViewWithNoSSR = dynamic(
  () => import('./GlobalMapView'),
  {
    ssr: false,
    loading: () => <p>Loading map...</p>
  }
);

export default GlobalMapViewWithNoSSR;
