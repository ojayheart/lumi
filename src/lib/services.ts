// Webhook-based guest profile system
// All AI processing (transcription, analysis, storage) is now handled by external webhook

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export { ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE };