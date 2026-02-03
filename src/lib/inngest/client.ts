import { Inngest } from "inngest";

// Event type definitions for type-safe event handling
export type Events = {
  // ElevenLabs conversation events
  "elevenlabs/conversation.ended": {
    data: {
      conversation_id: string;
      agent_id: string;
      status: "done" | "error" | "timeout";
      transcript: string;
      transcript_object?: Array<{
        role: "user" | "agent";
        message: string;
        timestamp?: number;
      }>;
      metadata?: Record<string, unknown>;
      analysis?: {
        transcript_summary?: string;
        call_successful?: string;
        data_collected?: Record<string, unknown>;
      };
    };
  };

  // Check-in processing events
  "checkin/daily.completed": {
    data: {
      record_id: string;
      guest_email: string;
      guest_name: string;
      transcript: string;
      insights?: Record<string, unknown>;
    };
  };

  // Conversation analysis events
  "conversation/analyze.requested": {
    data: {
      record_id: string;
      transcript: string;
      guest_email?: string;
      conversation_type: "checkin" | "inquiry" | "support";
    };
  };

  // Booking events
  "booking/inquiry.received": {
    data: {
      conversation_id: string;
      guest_email: string;
      guest_name: string;
      requested_dates?: {
        arrival?: string;
        departure?: string;
      };
      room_preferences?: string[];
      notes?: string;
    };
  };

  // Sync events
  "sync/guest.updated": {
    data: {
      guest_email: string;
      updates: Record<string, unknown>;
      source_base: "ai_knowledge" | "master_guest" | "current_retreat";
    };
  };

  // Notification events
  "notification/staff.alert": {
    data: {
      record_id: string;
      reason: string;
      severity: "low" | "medium" | "high" | "urgent";
      guest_email?: string;
      assigned_to?: string;
    };
  };

  "notification/send.email": {
    data: {
      to: string;
      subject: string;
      body: string;
      template?: string;
      metadata?: Record<string, unknown>;
    };
  };
};

// Create the Inngest client with event types
export const inngest = new Inngest({
  id: "lumi",
  schemas: new Map() as unknown as undefined,
});

// Re-export for convenience
export type { Inngest };
