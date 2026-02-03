import { inngest } from "../client";
import { aiKnowledge, masterGuest } from "@/lib/airtable";

/**
 * Handle ElevenLabs conversation.ended webhook
 * This is the main entry point for processing completed conversations
 */
export const handleConversationEnded = inngest.createFunction(
  {
    id: "elevenlabs-conversation-ended",
    retries: 3,
  },
  { event: "elevenlabs/conversation.ended" },
  async ({ event, step }) => {
    const { conversation_id, transcript, transcript_object, analysis, status } = event.data;

    // Step 1: Find existing record or create placeholder
    const existingRecord = await step.run("find-existing-record", async () => {
      return await aiKnowledge.findCheckinByConversationId(conversation_id);
    });

    if (!existingRecord) {
      // No pre-created record exists (edge case - webhook arrived before client-side creation)
      console.log(`No existing record for conversation ${conversation_id}, creating new entry`);

      const newRecord = await step.run("create-checkin-entry", async () => {
        return await aiKnowledge.createCheckinEntry({
          conversation_id,
          transcript: transcript || "",
          created_at: new Date().toISOString(),
          analysis_status: "pending",
        });
      });

      // Trigger analysis for the new record
      if (status === "done" && transcript) {
        await step.sendEvent("trigger-analysis", {
          name: "conversation/analyze.requested",
          data: {
            record_id: newRecord.id!,
            transcript,
            conversation_type: "checkin",
          },
        });
      }

      return { record_id: newRecord.id, status: "created" };
    }

    // Step 2: Update existing record with transcript data
    const updatedRecord = await step.run("update-with-transcript", async () => {
      const transcriptText = transcript ||
        transcript_object?.map((t: { role: string; message: string }) => `${t.role}: ${t.message}`).join("\n") ||
        "";

      return await aiKnowledge.updateCheckinEntry(existingRecord.id!, {
        transcript: transcriptText,
        analysis_status: status === "done" ? "pending" : "failed",
        // Store ElevenLabs' own analysis if available
        insights: analysis?.transcript_summary,
      });
    });

    // Step 3: Sync to Master Guest if email available
    if (existingRecord.email) {
      await step.run("sync-to-master-guest", async () => {
        await masterGuest.incrementCheckinCount(existingRecord.email!);
      });
    }

    // Step 4: Trigger deeper analysis if conversation was successful
    if (status === "done" && transcript) {
      await step.sendEvent("trigger-analysis", {
        name: "conversation/analyze.requested",
        data: {
          record_id: updatedRecord.id!,
          transcript,
          guest_email: existingRecord.email,
          conversation_type: "checkin",
        },
      });
    }

    // Step 5: Notify if conversation had errors
    if (status === "error" || status === "timeout") {
      await step.sendEvent("notify-error", {
        name: "notification/staff.alert",
        data: {
          record_id: existingRecord.id!,
          reason: `Conversation ended with status: ${status}`,
          severity: "medium",
          guest_email: existingRecord.email,
        },
      });
    }

    return {
      record_id: updatedRecord.id,
      status: "updated",
      conversation_status: status,
    };
  }
);

/**
 * Process daily check-in completion
 * Triggered after successful analysis of a check-in conversation
 */
export const handleDailyCheckinCompleted = inngest.createFunction(
  {
    id: "checkin-daily-completed",
    retries: 2,
  },
  { event: "checkin/daily.completed" },
  async ({ event, step }) => {
    const { record_id, guest_email, guest_name, insights } = event.data;

    // Step 1: Update Master Guest with check-in data
    if (guest_email) {
      await step.run("update-master-guest", async () => {
        const guest = await masterGuest.getGuestByEmail(guest_email);

        if (guest?.id) {
          await masterGuest.updateGuest(guest.id, {
            last_checkin_date: new Date().toISOString(),
            total_checkins: (guest.total_checkins || 0) + 1,
            notes: insights ? `Last check-in insights: ${JSON.stringify(insights)}` : undefined,
          });
        } else {
          // Create new guest profile if doesn't exist
          const [first_name, ...rest] = guest_name.split(" ");
          await masterGuest.createGuest({
            email: guest_email,
            first_name,
            last_name: rest.join(" ") || "",
            total_checkins: 1,
            last_checkin_date: new Date().toISOString(),
          });
        }
      });
    }

    // Step 2: Mark checkin entry as fully processed
    await step.run("mark-completed", async () => {
      await aiKnowledge.updateCheckinEntry(record_id, {
        analysis_status: "completed",
      });
    });

    return { success: true, record_id };
  }
);
