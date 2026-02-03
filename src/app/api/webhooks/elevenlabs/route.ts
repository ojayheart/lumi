import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import crypto from "crypto";

// ElevenLabs webhook payload types
interface ElevenLabsWebhookPayload {
  type: "conversation.ended";
  conversation_id: string;
  agent_id: string;
  status: "done" | "error" | "timeout";
  transcript?: string;
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
  created_at?: string;
}

/**
 * Verify ElevenLabs webhook signature
 * Uses HMAC-SHA256 with the webhook secret
 */
function verifySignature(
  signature: string | null,
  body: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.warn("Missing signature or secret for webhook verification");
    return false;
  }

  try {
    // ElevenLabs signature format: "v1=<hmac>"
    const parts = signature.split("=");
    if (parts.length !== 2 || parts[0] !== "v1") {
      console.warn("Invalid signature format");
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(parts[1], "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-elevenlabs-signature");

    // Verify webhook signature in production
    if (process.env.NODE_ENV === "production" || process.env.ELEVENLABS_WEBHOOK_SECRET) {
      const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

      if (!secret) {
        console.error("ELEVENLABS_WEBHOOK_SECRET not configured");
        return NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 500 }
        );
      }

      if (!verifySignature(signature, rawBody, secret)) {
        console.warn("Invalid webhook signature", {
          signature: signature?.substring(0, 20) + "...",
          bodyLength: rawBody.length,
        });
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Parse the webhook payload
    const payload: ElevenLabsWebhookPayload = JSON.parse(rawBody);

    // Validate required fields
    if (!payload.conversation_id || !payload.agent_id) {
      return NextResponse.json(
        { error: "Missing required fields: conversation_id, agent_id" },
        { status: 400 }
      );
    }

    // Only process conversation.ended events
    if (payload.type !== "conversation.ended") {
      console.log(`Ignoring webhook type: ${payload.type}`);
      return NextResponse.json({ received: true, processed: false });
    }

    // Build transcript string from object if not provided
    let transcript = payload.transcript;
    if (!transcript && payload.transcript_object) {
      transcript = payload.transcript_object
        .map((t) => `${t.role === "user" ? "Guest" : "Lumi"}: ${t.message}`)
        .join("\n");
    }

    // Send event to Inngest
    await inngest.send({
      name: "elevenlabs/conversation.ended",
      data: {
        conversation_id: payload.conversation_id,
        agent_id: payload.agent_id,
        status: payload.status,
        transcript: transcript || "",
        transcript_object: payload.transcript_object,
        metadata: payload.metadata,
        analysis: payload.analysis,
      },
    });

    const processingTime = Date.now() - startTime;

    console.log("ElevenLabs webhook processed", {
      conversation_id: payload.conversation_id,
      status: payload.status,
      has_transcript: !!transcript,
      processing_time_ms: processingTime,
    });

    return NextResponse.json({
      received: true,
      processed: true,
      conversation_id: payload.conversation_id,
    });
  } catch (error) {
    console.error("ElevenLabs webhook error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "elevenlabs-webhook",
    timestamp: new Date().toISOString(),
  });
}
