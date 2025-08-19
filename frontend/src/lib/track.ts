// Thin analytics shim. Swap implementation later.
export type TrackEvent = 'browse_page_load' | 'browse_prefetch' | 'browse_error';
export function track(event: TrackEvent, payload: Record<string, unknown>): void {
  console.log('[track]', event, payload);
}
