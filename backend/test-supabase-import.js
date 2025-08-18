(async () => {
  try {
    const mod = await import('@supabase/supabase-js');
    console.log('Imported supabase module keys:', Object.keys(mod));
  } catch (e) {
    console.error('Import failed:', e);
  }
})();
