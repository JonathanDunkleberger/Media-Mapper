import FavoritesGrid from '@/components/FavoritesGrid';
 
 export const metadata = { title: 'Profile • MediaMapper' };
 
 export default function ProfilePage() {
   return (
     <main className="mx-auto max-w-7xl px-6 py-8 pb-24">
       <h1 className="text-2xl font-semibold mb-6">My Media</h1>
       <FavoritesGrid />
     </main>
   );
 }
