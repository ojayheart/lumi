import { NextResponse } from "next/server";
import { masterGuest } from "@/lib/airtable";
import { z } from "zod";

// Request validation schema
const GetGuestProfileSchema = z.object({
  email: z.string().email().describe("Guest email address"),
});

/**
 * ElevenLabs Tool Endpoint: Get guest profile
 * Used to personalize conversations based on guest history
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = GetGuestProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Fetch guest profile
    const guest = await masterGuest.getGuestByEmail(email);

    if (!guest) {
      return NextResponse.json({
        found: false,
        message: "It looks like this is your first time connecting with us! I'm excited to help you learn about Aro Hā.",
        is_new_guest: true,
      });
    }

    // Format profile for agent context
    const profile = {
      found: true,
      is_new_guest: false,
      guest: {
        first_name: guest.first_name,
        last_name: guest.last_name,
        past_visits: guest.past_visits || 0,
        total_checkins: guest.total_checkins || 0,
      },
      preferences: {
        dietary_restrictions: guest.dietary_restrictions || [],
        allergies: guest.allergies || [],
        room_preferences: guest.room_preferences || [],
        wellness_goals: guest.wellness_goals || [],
      },
      context: buildContextMessage(guest),
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Get guest profile error:", error);

    return NextResponse.json(
      {
        found: false,
        message: "I couldn't retrieve your profile at the moment, but I'm happy to help you anyway!",
        error: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Build a natural language context message for the agent
 */
function buildContextMessage(guest: {
  first_name: string;
  last_name: string;
  past_visits?: number;
  total_checkins?: number;
  dietary_restrictions?: string[];
  allergies?: string[];
  room_preferences?: string[];
  wellness_goals?: string[];
  last_checkin_date?: string;
}): string {
  const parts: string[] = [];

  // Visit history
  if (guest.past_visits && guest.past_visits > 0) {
    parts.push(
      guest.past_visits === 1
        ? `${guest.first_name} has visited Aro Hā once before.`
        : `${guest.first_name} is a returning guest who has visited ${guest.past_visits} times.`
    );
  }

  // Recent check-in
  if (guest.last_checkin_date) {
    const lastCheckin = new Date(guest.last_checkin_date);
    const daysSince = Math.floor(
      (Date.now() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince < 7) {
      parts.push(`They last checked in ${daysSince} days ago.`);
    }
  }

  // Dietary needs
  if (guest.dietary_restrictions?.length || guest.allergies?.length) {
    const dietary = [
      ...(guest.dietary_restrictions || []),
      ...(guest.allergies?.map((a) => `${a} allergy`) || []),
    ];
    if (dietary.length > 0) {
      parts.push(`Dietary considerations: ${dietary.join(", ")}.`);
    }
  }

  // Room preferences
  if (guest.room_preferences?.length) {
    parts.push(`Room preferences: ${guest.room_preferences.join(", ")}.`);
  }

  // Wellness goals
  if (guest.wellness_goals?.length) {
    parts.push(`Wellness goals: ${guest.wellness_goals.join(", ")}.`);
  }

  return parts.length > 0
    ? parts.join(" ")
    : `${guest.first_name} is connecting with us for the first time.`;
}
