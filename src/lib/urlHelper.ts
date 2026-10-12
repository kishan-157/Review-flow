/**
 * Helper to compute the public, shareable URL for QR codes and review links.
 * Uses window.location.origin so the link accurately matches the active running application.
 */
export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://localboost.ai';
  return window.location.origin;
}
