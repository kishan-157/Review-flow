/**
 * Helper to compute the public, shareable URL for QR codes and review links.
 * In AI Studio preview environments, 'ais-dev-' is internal and requires Google login,
 * while 'ais-pre-' is the public preview accessible by any external mobile device.
 */
export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://localboost.ai';
  let origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}
