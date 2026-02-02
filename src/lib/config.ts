
// Determine the base URL for API calls, useful for background processing
let baseUrl = '';

if (typeof window !== 'undefined') {
  // Client-side: Use the current URL
  baseUrl = window.location.origin;
} else {
  // Server-side: Use environment variable or auto-detect from PORT
  // Ensure we always have a valid URL for server-side API calls
  baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
}

// For debugging
console.log('Using baseUrl:', baseUrl);

export const config = {
  baseUrl,
  audioUploadMaxSize: 100 * 1024 * 1024, // 100MB
  allowedAudioTypes: [
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a'
  ]
};
