import { inngest } from "../client";
import { currentRetreat, masterGuest, aiKnowledge } from "@/lib/airtable";

/**
 * Handle booking inquiry from conversation
 * Checks availability and notifies staff of new inquiry
 */
export const handleBookingInquiry = inngest.createFunction(
  {
    id: "booking-inquiry-received",
    retries: 3,
  },
  { event: "booking/inquiry.received" },
  async ({ event, step }) => {
    const { conversation_id, guest_email, guest_name, requested_dates, room_preferences, notes } = event.data;

    // Step 1: Check availability if dates provided
    let availableRooms: Awaited<ReturnType<typeof currentRetreat.checkAvailability>> = [];

    if (requested_dates?.arrival && requested_dates?.departure) {
      availableRooms = await step.run("check-availability", async () => {
        const roomType = room_preferences?.[0];
        return await currentRetreat.checkAvailability(
          requested_dates.arrival!,
          requested_dates.departure!,
          roomType
        );
      });
    }

    // Step 2: Create or update guest profile
    const guestProfile = await step.run("ensure-guest-profile", async () => {
      const existing = await masterGuest.getGuestByEmail(guest_email);

      if (existing?.id) {
        await masterGuest.updateGuest(existing.id, {
          room_preferences: room_preferences,
          notes: notes ? `${existing.notes || ""}\n\nInquiry: ${notes}`.trim() : existing.notes,
        });
        return existing;
      }

      // Create new guest
      const [first_name, ...rest] = guest_name.split(" ");
      return await masterGuest.createGuest({
        email: guest_email,
        first_name,
        last_name: rest.join(" ") || "",
        room_preferences,
        notes: notes ? `Initial inquiry: ${notes}` : undefined,
      });
    });

    // Step 3: Determine urgency and notify staff
    const hasAvailability = availableRooms.length > 0;
    const isUrgent = requested_dates?.arrival
      ? new Date(requested_dates.arrival).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
      : false;

    await step.sendEvent("notify-reservations", {
      name: "notification/staff.alert",
      data: {
        record_id: conversation_id,
        reason: `New booking inquiry from ${guest_name}. ${
          hasAvailability
            ? `${availableRooms.length} rooms available.`
            : "No availability for requested dates."
        }`,
        severity: isUrgent ? "high" : "medium",
        guest_email,
        assigned_to: "reservations@aro-ha.com",
      },
    });

    // Step 4: Send follow-up email to guest
    await step.sendEvent("send-guest-email", {
      name: "notification/send.email",
      data: {
        to: guest_email,
        subject: "Thank you for your inquiry - Aro Hā",
        body: hasAvailability
          ? `Dear ${guest_name.split(" ")[0]},\n\nThank you for your interest in Aro Hā. We have availability for your requested dates and our reservations team will be in touch shortly with personalized recommendations.\n\nWarm regards,\nThe Aro Hā Team`
          : `Dear ${guest_name.split(" ")[0]},\n\nThank you for your interest in Aro Hā. While your requested dates may not be available, our reservations team will reach out with alternative options that may suit you.\n\nWarm regards,\nThe Aro Hā Team`,
        template: "booking_inquiry_confirmation",
        metadata: {
          conversation_id,
          has_availability: hasAvailability,
        },
      },
    });

    return {
      success: true,
      guest_id: guestProfile.id,
      available_rooms: availableRooms.length,
      follow_up_sent: true,
    };
  }
);

/**
 * Check availability tool endpoint handler
 * Used by ElevenLabs tool calling during conversations
 */
export async function checkAvailabilityHandler(params: {
  arrival_date: string;
  departure_date: string;
  room_type?: string;
  guests?: number;
}) {
  const { arrival_date, departure_date, room_type, guests } = params;

  const rooms = await currentRetreat.checkAvailability(
    arrival_date,
    departure_date,
    room_type
  );

  // Filter by capacity if specified
  const filteredRooms = guests
    ? rooms.filter((room) => room.capacity >= guests)
    : rooms;

  if (filteredRooms.length === 0) {
    return {
      available: false,
      message: `Unfortunately, we don't have availability for those dates. Would you like me to check alternative dates?`,
      alternative_suggestion: true,
    };
  }

  const cheapestRoom = filteredRooms.reduce((min, room) =>
    room.price_per_night < min.price_per_night ? room : min
  );

  return {
    available: true,
    rooms_available: filteredRooms.length,
    room_types: [...new Set(filteredRooms.map((r) => r.room_type))],
    starting_price: cheapestRoom.price_per_night,
    message: `Great news! We have ${filteredRooms.length} room${filteredRooms.length > 1 ? "s" : ""} available for your dates, starting from $${cheapestRoom.price_per_night} per night.`,
  };
}
