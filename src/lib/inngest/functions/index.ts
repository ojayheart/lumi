// Export all Inngest functions for registration

export { handleConversationEnded, handleDailyCheckinCompleted } from "./elevenlabs";
export { handleBookingInquiry } from "./booking";
export { handleGuestUpdated, batchSyncCheckins, handleProfileEnrichment } from "./sync";
export { sendEmailNotification, handleStaffAlert } from "./notifications";
export { analyzeConversation } from "./analysis";

// Re-export for convenient function list
import { handleConversationEnded, handleDailyCheckinCompleted } from "./elevenlabs";
import { handleBookingInquiry } from "./booking";
import { handleGuestUpdated, batchSyncCheckins, handleProfileEnrichment } from "./sync";
import { sendEmailNotification, handleStaffAlert } from "./notifications";
import { analyzeConversation } from "./analysis";

/**
 * All Inngest functions to be served
 * Import this in the API route
 */
export const functions = [
  // ElevenLabs conversation handling
  handleConversationEnded,
  handleDailyCheckinCompleted,

  // Booking management
  handleBookingInquiry,

  // Data synchronization
  handleGuestUpdated,
  batchSyncCheckins,
  handleProfileEnrichment,

  // Notifications
  sendEmailNotification,
  handleStaffAlert,

  // AI Analysis
  analyzeConversation,
];
