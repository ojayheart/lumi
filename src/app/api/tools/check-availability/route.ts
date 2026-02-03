import { NextResponse } from "next/server";
import { currentRetreat } from "@/lib/airtable";
import { z } from "zod";

// Request validation schema
const CheckAvailabilitySchema = z.object({
  arrival_date: z.string().describe("Arrival date in YYYY-MM-DD format"),
  departure_date: z.string().describe("Departure date in YYYY-MM-DD format"),
  room_type: z.string().optional().describe("Preferred room type"),
  guests: z.number().optional().describe("Number of guests"),
});

/**
 * ElevenLabs Tool Endpoint: Check room availability
 * Called by the voice/chat agent during conversations
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = CheckAvailabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { arrival_date, departure_date, room_type, guests } = parsed.data;

    // Validate dates
    const arrival = new Date(arrival_date);
    const departure = new Date(departure_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (arrival < today) {
      return NextResponse.json({
        available: false,
        message: "The arrival date cannot be in the past. What dates would work for you?",
      });
    }

    if (departure <= arrival) {
      return NextResponse.json({
        available: false,
        message: "The departure date must be after the arrival date. Could you confirm your dates?",
      });
    }

    // Query availability
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
      // Calculate alternative suggestions
      const nights = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));

      return NextResponse.json({
        available: false,
        requested: {
          arrival_date,
          departure_date,
          nights,
          room_type,
          guests,
        },
        message: room_type
          ? `Unfortunately, we don't have any ${room_type} rooms available for those dates. Would you like me to check other room types, or perhaps suggest alternative dates?`
          : `Unfortunately, we're fully booked for those dates. Would you like me to check alternative dates, or would you like to join our waitlist?`,
        suggestions: [
          "Check alternative dates",
          "View other room types",
          "Join waitlist",
        ],
      });
    }

    // Calculate stay details
    const nights = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
    const roomTypes = [...new Set(filteredRooms.map((r) => r.room_type))];
    const cheapestRoom = filteredRooms.reduce((min, room) =>
      room.price_per_night < min.price_per_night ? room : min
    );
    const mostExpensiveRoom = filteredRooms.reduce((max, room) =>
      room.price_per_night > max.price_per_night ? room : max
    );

    return NextResponse.json({
      available: true,
      requested: {
        arrival_date,
        departure_date,
        nights,
        room_type,
        guests,
      },
      availability: {
        rooms_available: filteredRooms.length,
        room_types: roomTypes,
        price_range: {
          from: cheapestRoom.price_per_night,
          to: mostExpensiveRoom.price_per_night,
          currency: "NZD",
        },
        estimated_total: {
          from: cheapestRoom.price_per_night * nights,
          to: mostExpensiveRoom.price_per_night * nights,
          currency: "NZD",
        },
      },
      message: filteredRooms.length === 1
        ? `Great news! We have one ${filteredRooms[0].room_type} room available for your dates, at $${cheapestRoom.price_per_night} per night. That would be approximately $${cheapestRoom.price_per_night * nights} for your ${nights}-night stay.`
        : `Wonderful! We have ${filteredRooms.length} rooms available for your dates. ${roomTypes.length > 1 ? `Room types include ${roomTypes.join(" and ")}. ` : ""}Prices start from $${cheapestRoom.price_per_night} per night, which would be approximately $${cheapestRoom.price_per_night * nights} for your ${nights}-night stay. Would you like me to tell you more about our room options?`,
    });
  } catch (error) {
    console.error("Check availability error:", error);

    return NextResponse.json(
      {
        available: false,
        message: "I'm having trouble checking availability right now. Our reservations team will be happy to help you - would you like me to have someone reach out to you?",
        error: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
