import { inngest } from "../client";
import { masterGuest, aiKnowledge } from "@/lib/airtable";

/**
 * Sync guest data when updated in any base
 * Ensures Master Guest is the source of truth for guest profiles
 */
export const handleGuestUpdated = inngest.createFunction(
  {
    id: "sync-guest-updated",
    retries: 3,
    concurrency: {
      // Prevent race conditions when same guest is updated rapidly
      key: "event.data.guest_email",
      limit: 1,
    },
  },
  { event: "sync/guest.updated" },
  async ({ event, step }) => {
    const { guest_email, updates, source_base } = event.data;

    // Step 1: Get current guest profile from Master Guest
    const existingGuest = await step.run("get-master-guest", async () => {
      return await masterGuest.getGuestByEmail(guest_email);
    });

    if (!existingGuest) {
      console.log(`Guest ${guest_email} not found in Master Guest base`);
      return { success: false, reason: "guest_not_found" };
    }

    // Step 2: Merge updates based on source base rules
    type GuestUpdates = {
      wellness_goals?: string[];
      notes?: string;
      last_checkin_date?: string;
      dietary_restrictions?: string[];
      allergies?: string[];
      room_preferences?: string[];
      past_visits?: number;
    };

    const mergedUpdates = await step.run("merge-updates", async (): Promise<GuestUpdates> => {
      // Different source bases have different trust levels
      // Master Guest is authoritative, others can only append/suggest

      switch (source_base) {
        case "ai_knowledge":
          // AI Knowledge can update wellness-related fields
          return {
            wellness_goals: updates.wellness_goals as string[] | undefined,
            notes: updates.notes
              ? `${existingGuest.notes || ""}\n[AI Insight] ${updates.notes}`.trim()
              : undefined,
            last_checkin_date: updates.last_checkin_date as string | undefined,
          };

        case "current_retreat":
          // Current Retreat can update preferences and visit count
          return {
            dietary_restrictions: updates.dietary_restrictions as string[] | undefined,
            allergies: updates.allergies as string[] | undefined,
            room_preferences: updates.room_preferences as string[] | undefined,
            past_visits: updates.past_visits as number | undefined,
          };

        case "master_guest":
          // Master Guest updates are authoritative
          return updates as GuestUpdates;

        default:
          return {};
      }
    });

    // Step 3: Apply updates if any
    const keysToUpdate = Object.keys(mergedUpdates).filter(
      (k) => mergedUpdates[k as keyof GuestUpdates] !== undefined
    );

    if (keysToUpdate.length > 0) {
      await step.run("update-master-guest", async () => {
        await masterGuest.updateGuest(existingGuest.id!, mergedUpdates);
      });
    }

    return {
      success: true,
      guest_email,
      source_base,
      fields_updated: keysToUpdate,
    };
  }
);

/**
 * Batch sync all check-in data to Master Guest
 * Can be triggered manually or on a schedule
 */
export const batchSyncCheckins = inngest.createFunction(
  {
    id: "sync-batch-checkins",
    retries: 1,
  },
  { event: "sync/batch.checkins" },
  async ({ step }) => {
    // This would be implemented with pagination for large datasets
    // For now, it's a placeholder for the batch sync logic

    const syncedCount = await step.run("sync-recent-checkins", async () => {
      // Implementation would:
      // 1. Query AI Knowledge for recent check-ins
      // 2. Group by guest email
      // 3. Update Master Guest with aggregated data
      return 0;
    });

    return { synced_count: syncedCount };
  }
);

/**
 * Handle profile enrichment from conversation analysis
 * Updates guest profile with extracted preferences and patterns
 */
export const handleProfileEnrichment = inngest.createFunction(
  {
    id: "sync-profile-enrichment",
    retries: 2,
  },
  { event: "sync/profile.enriched" },
  async ({ event, step }) => {
    const { guest_email, extracted_data } = event.data as {
      guest_email: string;
      extracted_data: {
        dietary_preferences?: string[];
        wellness_goals?: string[];
        sleep_patterns?: string;
        stress_indicators?: string;
        preferences_mentioned?: string[];
      };
    };

    // Step 1: Get existing profile
    const guest = await step.run("get-guest", async () => {
      return await masterGuest.getGuestByEmail(guest_email);
    });

    if (!guest?.id) {
      return { success: false, reason: "guest_not_found" };
    }

    // Step 2: Intelligently merge extracted data
    const updates = await step.run("prepare-enrichment", async () => {
      const enrichment: Record<string, unknown> = {};

      // Merge dietary preferences (combine with existing, dedupe)
      if (extracted_data.dietary_preferences?.length) {
        const existing = new Set(guest.dietary_restrictions || []);
        const combined = [...existing, ...extracted_data.dietary_preferences];
        enrichment.dietary_restrictions = [...new Set(combined)];
      }

      // Merge wellness goals
      if (extracted_data.wellness_goals?.length) {
        const existing = new Set(guest.wellness_goals || []);
        const combined = [...existing, ...extracted_data.wellness_goals];
        enrichment.wellness_goals = [...new Set(combined)];
      }

      // Append insights to notes
      const insights: string[] = [];
      if (extracted_data.sleep_patterns) {
        insights.push(`Sleep: ${extracted_data.sleep_patterns}`);
      }
      if (extracted_data.stress_indicators) {
        insights.push(`Stress: ${extracted_data.stress_indicators}`);
      }
      if (insights.length) {
        enrichment.notes = `${guest.notes || ""}\n[${new Date().toISOString().split("T")[0]}] ${insights.join(". ")}`.trim();
      }

      return enrichment;
    });

    // Step 3: Apply enrichment
    if (Object.keys(updates).length > 0) {
      await step.run("apply-enrichment", async () => {
        await masterGuest.updateGuest(guest.id!, updates);
      });
    }

    return {
      success: true,
      guest_email,
      fields_enriched: Object.keys(updates),
    };
  }
);
