import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { masterGuest, aiKnowledge, currentRetreat } from "@/lib/airtable";

/**
 * Tool: Get guest history
 * Retrieves historical data about a guest for pattern analysis
 */
export const getGuestHistoryTool = createTool({
  name: "get_guest_history",
  description: "Retrieve a guest's historical check-ins, preferences, and past interactions for pattern analysis",
  parameters: z.object({
    email: z.string().email().describe("Guest email address"),
  }),
  handler: async ({ email }) => {
    const guest = await masterGuest.getGuestByEmail(email);

    if (!guest) {
      return {
        found: false,
        message: "No guest history found for this email",
      };
    }

    return {
      found: true,
      guest: {
        name: `${guest.first_name} ${guest.last_name}`,
        past_visits: guest.past_visits || 0,
        total_checkins: guest.total_checkins || 0,
        last_checkin: guest.last_checkin_date,
        wellness_goals: guest.wellness_goals || [],
        dietary_restrictions: guest.dietary_restrictions || [],
        allergies: guest.allergies || [],
        room_preferences: guest.room_preferences || [],
        notes: guest.notes,
      },
    };
  },
});

/**
 * Tool: Update guest insights
 * Saves extracted insights to the guest profile
 */
export const updateGuestInsightsTool = createTool({
  name: "update_guest_insights",
  description: "Save extracted wellness insights or preferences to a guest's profile",
  parameters: z.object({
    email: z.string().email().describe("Guest email address"),
    wellness_goals: z.array(z.string()).optional().describe("Wellness goals to add"),
    dietary_restrictions: z.array(z.string()).optional().describe("Dietary restrictions to add"),
    insights_note: z.string().optional().describe("Free-form insight to add to notes"),
  }),
  handler: async ({ email, wellness_goals, dietary_restrictions, insights_note }) => {
    const guest = await masterGuest.getGuestByEmail(email);

    if (!guest?.id) {
      return { success: false, reason: "Guest not found" };
    }

    const updates: Record<string, unknown> = {};

    if (wellness_goals?.length) {
      const existing = new Set(guest.wellness_goals || []);
      updates.wellness_goals = [...new Set([...existing, ...wellness_goals])];
    }

    if (dietary_restrictions?.length) {
      const existing = new Set(guest.dietary_restrictions || []);
      updates.dietary_restrictions = [...new Set([...existing, ...dietary_restrictions])];
    }

    if (insights_note) {
      const timestamp = new Date().toISOString().split("T")[0];
      updates.notes = `${guest.notes || ""}\n[${timestamp}] ${insights_note}`.trim();
    }

    if (Object.keys(updates).length > 0) {
      await masterGuest.updateGuest(guest.id, updates);
    }

    return { success: true, fields_updated: Object.keys(updates) };
  },
});

/**
 * Tool: Flag for staff attention
 * Creates an alert when concerning patterns are detected
 */
export const flagForAttentionTool = createTool({
  name: "flag_for_attention",
  description: "Flag a guest interaction for staff follow-up when concerning patterns or urgent needs are detected",
  parameters: z.object({
    record_id: z.string().describe("The check-in record ID"),
    reason: z.string().describe("Why staff attention is needed"),
    severity: z.enum(["low", "medium", "high", "urgent"]).describe("Urgency level"),
    recommended_action: z.string().optional().describe("Suggested action for staff"),
  }),
  handler: async ({ record_id, reason, severity, recommended_action }) => {
    // This would typically trigger a notification event
    // For now, we log and return the flag data

    console.log("Staff attention flagged:", {
      record_id,
      reason,
      severity,
      recommended_action,
      timestamp: new Date().toISOString(),
    });

    return {
      flagged: true,
      record_id,
      severity,
      message: `Alert created: ${reason}`,
      action: recommended_action,
    };
  },
});

/**
 * Tool: Get retreat context
 * Retrieves current retreat information for contextual recommendations
 */
export const getRetreatContextTool = createTool({
  name: "get_retreat_context",
  description: "Get current retreat context including available treatments and activities",
  parameters: z.object({
    include_treatments: z.boolean().optional().describe("Include available treatments"),
    include_menu: z.boolean().optional().describe("Include today's menu"),
  }),
  handler: async ({ include_treatments, include_menu }) => {
    const context: Record<string, unknown> = {
      retreat_name: "Aro Hā",
      location: "Glenorchy, New Zealand",
    };

    if (include_treatments) {
      const treatments = await currentRetreat.getTreatments();
      context.available_treatments = treatments
        .filter((t) => t.available)
        .map((t) => ({
          name: t.name,
          category: t.category,
          duration: t.duration_minutes,
        }));
    }

    if (include_menu) {
      const menu = await currentRetreat.getMenu();
      context.todays_menu = menu
        .filter((m) => m.available)
        .map((m) => ({
          name: m.name,
          meal_type: m.meal_type,
          dietary_tags: m.dietary_tags,
        }));
    }

    return context;
  },
});

/**
 * Tool: Compare to baseline
 * Compare current check-in to guest's typical patterns
 */
export const compareToBaselineTool = createTool({
  name: "compare_to_baseline",
  description: "Compare current check-in indicators to guest's historical baseline",
  parameters: z.object({
    email: z.string().email().describe("Guest email"),
    current_indicators: z.object({
      sleep_quality: z.enum(["good", "fair", "poor"]).optional(),
      energy_level: z.enum(["high", "normal", "low"]).optional(),
      stress_level: z.enum(["low", "moderate", "high"]).optional(),
      mood: z.enum(["positive", "neutral", "low"]).optional(),
    }).describe("Current check-in wellness indicators"),
  }),
  handler: async ({ email, current_indicators }) => {
    // In a full implementation, this would query historical check-ins
    // and calculate statistical baselines

    const guest = await masterGuest.getGuestByEmail(email);

    if (!guest || !guest.total_checkins || guest.total_checkins < 3) {
      return {
        has_baseline: false,
        message: "Not enough historical data for baseline comparison",
        current: current_indicators,
      };
    }

    // Placeholder baseline comparison
    // Real implementation would aggregate past check-in data
    const deviations: string[] = [];

    if (current_indicators.sleep_quality === "poor") {
      deviations.push("Sleep quality below typical");
    }
    if (current_indicators.energy_level === "low") {
      deviations.push("Energy lower than usual");
    }
    if (current_indicators.stress_level === "high") {
      deviations.push("Elevated stress indicators");
    }
    if (current_indicators.mood === "low") {
      deviations.push("Mood tracking lower");
    }

    return {
      has_baseline: true,
      checkin_count: guest.total_checkins,
      current: current_indicators,
      deviations,
      requires_attention: deviations.length >= 2,
      message:
        deviations.length > 0
          ? `Detected ${deviations.length} deviation(s) from baseline: ${deviations.join(", ")}`
          : "All indicators within normal range for this guest",
    };
  },
});
