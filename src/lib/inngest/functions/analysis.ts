import { inngest } from "../client";
import { aiKnowledge } from "@/lib/airtable";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

// Schema for conversation analysis output
const ConversationAnalysisSchema = z.object({
  summary: z.string().describe("Brief summary of the conversation (2-3 sentences)"),
  sentiment: z.enum(["positive", "neutral", "concerned", "negative"]).describe("Overall emotional tone"),
  wellness_indicators: z.object({
    sleep_quality: z.enum(["good", "fair", "poor", "not_mentioned"]).optional(),
    stress_level: z.enum(["low", "moderate", "high", "not_mentioned"]).optional(),
    energy_level: z.enum(["high", "normal", "low", "not_mentioned"]).optional(),
    mood: z.enum(["positive", "neutral", "low", "not_mentioned"]).optional(),
  }),
  topics_discussed: z.array(z.string()).describe("Main topics covered in conversation"),
  preferences_mentioned: z.array(z.string()).describe("Any preferences expressed by guest"),
  dietary_notes: z.array(z.string()).optional().describe("Dietary preferences or restrictions mentioned"),
  action_items: z.array(z.string()).describe("Follow-up actions needed"),
  requires_attention: z.boolean().describe("Whether this needs staff follow-up"),
  attention_reason: z.string().optional().describe("Why staff attention is needed"),
  extracted_goals: z.array(z.string()).optional().describe("Wellness goals expressed"),
});

type ConversationAnalysis = z.infer<typeof ConversationAnalysisSchema>;

/**
 * Analyze conversation using AI
 * Extracts insights, sentiment, and actionable items from transcripts
 */
export const analyzeConversation = inngest.createFunction(
  {
    id: "conversation-analyze",
    retries: 2,
  },
  { event: "conversation/analyze.requested" },
  async ({ event, step }) => {
    const { record_id, transcript, guest_email, conversation_type } = event.data;

    // Step 1: Mark as processing
    await step.run("mark-processing", async () => {
      await aiKnowledge.updateCheckinEntry(record_id, {
        analysis_status: "processing",
      });
    });

    // Step 2: Run AI analysis
    const analysis = await step.run("analyze-transcript", async (): Promise<ConversationAnalysis> => {
      const systemPrompt = getAnalysisPrompt(conversation_type);

      const result = await generateObject({
        model: google("gemini-2.0-flash"),
        schema: ConversationAnalysisSchema,
        system: systemPrompt,
        prompt: `Analyze this wellness check-in conversation transcript:\n\n${transcript}`,
      });

      return result.object;
    });

    // Step 3: Save analysis results
    await step.run("save-analysis", async () => {
      await aiKnowledge.updateCheckinEntry(record_id, {
        insights: JSON.stringify({
          summary: analysis.summary,
          wellness_indicators: analysis.wellness_indicators,
          topics: analysis.topics_discussed,
          preferences: analysis.preferences_mentioned,
          goals: analysis.extracted_goals,
        }),
        sentiment: analysis.sentiment,
        action_items: analysis.action_items.join("; "),
        analysis_status: "completed",
      });
    });

    // Step 4: Trigger follow-up events based on analysis
    const events: Array<{ name: string; data: Record<string, unknown> }> = [];

    // Alert staff if concerning patterns detected
    if (analysis.requires_attention) {
      events.push({
        name: "notification/staff.alert",
        data: {
          record_id,
          reason: analysis.attention_reason || "Conversation flagged for review",
          severity: analysis.sentiment === "negative" ? "high" : "medium",
          guest_email,
        },
      });
    }

    // Enrich profile if we have valuable data
    if (
      guest_email &&
      (analysis.preferences_mentioned.length > 0 ||
        analysis.dietary_notes?.length ||
        analysis.extracted_goals?.length)
    ) {
      events.push({
        name: "sync/profile.enriched",
        data: {
          guest_email,
          extracted_data: {
            dietary_preferences: analysis.dietary_notes,
            wellness_goals: analysis.extracted_goals,
            sleep_patterns:
              analysis.wellness_indicators.sleep_quality !== "not_mentioned"
                ? analysis.wellness_indicators.sleep_quality
                : undefined,
            stress_indicators:
              analysis.wellness_indicators.stress_level !== "not_mentioned"
                ? analysis.wellness_indicators.stress_level
                : undefined,
            preferences_mentioned: analysis.preferences_mentioned,
          },
        },
      });
    }

    // Emit daily completion for successful check-ins
    if (conversation_type === "checkin" && analysis.sentiment !== "negative") {
      events.push({
        name: "checkin/daily.completed",
        data: {
          record_id,
          guest_email,
          guest_name: "", // Would be populated from record
          transcript,
          insights: analysis,
        },
      });
    }

    // Send all events
    if (events.length > 0) {
      await step.sendEvent("follow-up-events", events);
    }

    return {
      success: true,
      record_id,
      analysis_summary: analysis.summary,
      sentiment: analysis.sentiment,
      requires_attention: analysis.requires_attention,
      events_triggered: events.map((e) => e.name),
    };
  }
);

/**
 * Get appropriate analysis prompt based on conversation type
 */
function getAnalysisPrompt(conversationType: string): string {
  const basePrompt = `You are a wellness analyst for Aro Hā, a luxury wellness retreat in New Zealand.
Your role is to analyze guest conversations and extract meaningful insights to improve their experience.

Guidelines:
- Be empathetic and understanding of guest concerns
- Look for patterns that might indicate wellness needs
- Identify preferences that can personalize their stay
- Flag anything that needs immediate staff attention
- Extract actionable insights, not just observations`;

  switch (conversationType) {
    case "checkin":
      return `${basePrompt}

This is a daily check-in conversation where guests share how they're feeling.
Focus on:
- Physical and emotional wellbeing indicators
- Sleep quality and energy levels
- Any concerns about their retreat experience
- Dietary needs or preferences mentioned
- Goals they want to achieve during their stay`;

    case "inquiry":
      return `${basePrompt}

This is a booking inquiry conversation from a potential guest.
Focus on:
- What type of experience they're looking for
- Any specific dates or room preferences
- Dietary restrictions or health considerations
- Past retreat experience
- Motivations for visiting Aro Hā`;

    case "support":
      return `${basePrompt}

This is a support conversation with a current guest.
Focus on:
- The issue or question they have
- Level of urgency
- Whether they need immediate assistance
- Any dissatisfaction that needs addressing
- Opportunities to enhance their experience`;

    default:
      return basePrompt;
  }
}
