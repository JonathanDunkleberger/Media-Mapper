import dynamic from 'next/dynamic';
export { default } from './GlobalMapView';

// SSR-safe dynamic import for react-leaflet (avoids Next.js SSR issues)
export const GlobalMapViewDynamic = dynamic(() => import('./GlobalMapView'), { ssr: false });
