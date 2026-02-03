import { createNetwork, getDefaultRoutingAgent } from "@inngest/agent-kit";
import {
  insightExtractorAgent,
  sentimentAnalyzerAgent,
  routingAgent,
  profileEnricherAgent,
} from "./analyzer";

/**
 * Conversation Analysis Network
 *
 * A multi-agent network for comprehensive conversation analysis.
 * Agents work together to extract insights, analyze sentiment,
 * determine actions, and enrich guest profiles.
 *
 * Flow:
 * 1. Insight Extractor - Extracts wellness data from transcript
 * 2. Sentiment Analyzer - Assesses emotional patterns
 * 3. Routing Agent - Determines follow-up actions
 * 4. Profile Enricher - Updates guest profile (if applicable)
 */
export const conversationAnalysisNetwork = createNetwork({
  name: "conversation-analysis",
  agents: [
    insightExtractorAgent,
    sentimentAnalyzerAgent,
    routingAgent,
    profileEnricherAgent,
  ],
  maxIter: 10,
  // Use the default routing agent which uses AI to determine the next agent
  router: getDefaultRoutingAgent(),
});

/**
 * Input type for the conversation analysis network
 */
export interface ConversationAnalysisInput {
  transcript: string;
  record_id: string;
  guest_email?: string;
  guest_name?: string;
  conversation_type: "checkin" | "inquiry" | "support";
}

/**
 * Output type from the conversation analysis network
 */
export interface ConversationAnalysisOutput {
  insights: {
    summary: string;
    wellness_indicators: Record<string, string>;
    topics: string[];
    preferences: string[];
    concerns: string[];
  };
  sentiment: {
    overall: string;
    emotions: string[];
    red_flags: string[];
  };
  actions: {
    routing: string[];
    priority: string;
    recommendations: string[];
  };
  profile_updates: {
    fields_updated: string[];
    skipped_reason?: string;
  };
}

/**
 * Run the conversation analysis network
 */
export async function analyzeConversationWithAgents(
  input: ConversationAnalysisInput
): Promise<ConversationAnalysisOutput> {
  const prompt = `
Analyze this wellness check-in conversation:

Record ID: ${input.record_id}
Guest: ${input.guest_name || "Unknown"} ${input.guest_email ? `(${input.guest_email})` : ""}
Type: ${input.conversation_type}

Transcript:
${input.transcript}

Please extract insights, analyze sentiment, determine routing, and update the guest profile as appropriate.
  `.trim();

  const result = await conversationAnalysisNetwork.run(prompt, {
    state: new Map([
      ["record_id", input.record_id],
      ["guest_email", input.guest_email || ""],
      ["conversation_type", input.conversation_type],
    ]),
  });

  // Parse the final output from the network
  // Extract text from the last message if available
  const messages = result.state?.messages || [];
  let outputText = "";

  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if ("text" in lastMessage && typeof lastMessage.text === "string") {
      outputText = lastMessage.text;
    }
  }

  return {
    insights: {
      summary: outputText || "",
      wellness_indicators: {},
      topics: [],
      preferences: [],
      concerns: [],
    },
    sentiment: {
      overall: "neutral",
      emotions: [],
      red_flags: [],
    },
    actions: {
      routing: [],
      priority: "normal",
      recommendations: [],
    },
    profile_updates: {
      fields_updated: [],
    },
  };
}

export { conversationAnalysisNetwork as default };
