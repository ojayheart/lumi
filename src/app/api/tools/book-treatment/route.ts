import { NextResponse } from "next/server";
import { currentRetreat, masterGuest } from "@/lib/airtable";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";

// Request validation schema
const BookTreatmentSchema = z.object({
  guest_email: z.string().email().describe("Guest email address"),
  treatment_id: z.string().optional().describe("Specific treatment ID to book"),
  treatment_name: z.string().optional().describe("Treatment name (if ID not known)"),
  preferred_date: z.string().optional().describe("Preferred date in YYYY-MM-DD format"),
  preferred_time: z.string().optional().describe("Preferred time slot"),
  notes: z.string().optional().describe("Special requests or notes"),
});

/**
 * ElevenLabs Tool Endpoint: Book or inquire about treatments
 * Called when guest wants to book spa/wellness treatments
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = BookTreatmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { guest_email, treatment_id, treatment_name, preferred_date, preferred_time, notes } = parsed.data;

    // Get available treatments
    const treatments = await currentRetreat.getTreatments();

    // If no specific treatment requested, provide options
    if (!treatment_id && !treatment_name) {
      const availableTreatments = treatments.filter((t) => t.available);
      const categories = [...new Set(availableTreatments.map((t) => t.category))];

      return NextResponse.json({
        action: "list_treatments",
        treatments: availableTreatments.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          duration: t.duration_minutes,
          price: t.price,
          category: t.category,
        })),
        categories,
        message: `We offer a wonderful range of treatments across ${categories.length} categories: ${categories.join(", ")}. Would you like me to describe any specific treatment, or tell you more about a particular category?`,
      });
    }

    // Find the requested treatment
    const treatment = treatment_id
      ? treatments.find((t) => t.id === treatment_id)
      : treatments.find((t) => t.name.toLowerCase().includes(treatment_name!.toLowerCase()));

    if (!treatment) {
      return NextResponse.json({
        action: "treatment_not_found",
        available_treatments: treatments.filter((t) => t.available).map((t) => t.name),
        message: `I couldn't find that specific treatment. Here are our available treatments: ${treatments
          .filter((t) => t.available)
          .map((t) => t.name)
          .join(", ")}. Which one would you like to know more about?`,
      });
    }

    if (!treatment.available) {
      // Find alternatives in same category
      const alternatives = treatments.filter(
        (t) => t.available && t.category === treatment.category
      );

      return NextResponse.json({
        action: "treatment_unavailable",
        treatment_name: treatment.name,
        alternatives: alternatives.map((t) => ({
          name: t.name,
          duration: t.duration_minutes,
          price: t.price,
        })),
        message: `The ${treatment.name} is currently unavailable. However, we have other wonderful ${treatment.category} treatments: ${alternatives.map((t) => t.name).join(", ")}. Would any of these interest you?`,
      });
    }

    // Create booking inquiry
    const guest = await masterGuest.getGuestByEmail(guest_email);

    // Send event to track the inquiry
    await inngest.send({
      name: "booking/treatment.requested",
      data: {
        guest_email,
        guest_name: guest ? `${guest.first_name} ${guest.last_name}` : "Guest",
        treatment_id: treatment.id,
        treatment_name: treatment.name,
        preferred_date,
        preferred_time,
        notes,
      },
    });

    return NextResponse.json({
      action: "booking_requested",
      treatment: {
        name: treatment.name,
        description: treatment.description,
        duration: treatment.duration_minutes,
        price: treatment.price,
        category: treatment.category,
      },
      booking_details: {
        guest_email,
        preferred_date,
        preferred_time,
        notes,
      },
      message: `Wonderful choice! The ${treatment.name} is a ${treatment.duration_minutes}-minute treatment priced at $${treatment.price}. ${treatment.description} I've noted your interest${preferred_date ? ` for ${preferred_date}${preferred_time ? ` around ${preferred_time}` : ""}` : ""}. Our spa team will confirm your booking and reach out with available time slots. Is there anything else you'd like to know about this treatment?`,
      confirmation_pending: true,
    });
  } catch (error) {
    console.error("Book treatment error:", error);

    return NextResponse.json(
      {
        action: "error",
        message: "I'm having trouble processing your treatment request right now. Our spa team can help you directly - would you like me to have someone reach out to you?",
        error: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
