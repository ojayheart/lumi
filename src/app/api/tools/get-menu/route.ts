import { NextResponse } from "next/server";
import { currentRetreat, masterGuest } from "@/lib/airtable";
import { z } from "zod";

// Request validation schema
const GetMenuSchema = z.object({
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional().describe("Type of meal"),
  dietary_filter: z.array(z.string()).optional().describe("Dietary restrictions to filter by"),
  guest_email: z.string().email().optional().describe("Guest email for personalized recommendations"),
});

/**
 * ElevenLabs Tool Endpoint: Get menu information
 * Provides menu details with dietary filtering and personalization
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = GetMenuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { meal_type, dietary_filter, guest_email } = parsed.data;

    // Get guest dietary preferences if email provided
    let guestDietary: string[] = [];
    if (guest_email) {
      const guest = await masterGuest.getGuestByEmail(guest_email);
      if (guest) {
        guestDietary = [
          ...(guest.dietary_restrictions || []),
          ...(guest.allergies?.map((a) => `${a}-free`) || []),
        ];
      }
    }

    // Combine filters
    const allFilters = [
      ...(dietary_filter || []),
      ...guestDietary,
    ].map((f) => f.toLowerCase());

    // Get menu items
    const menuItems = await currentRetreat.getMenu(meal_type);
    const availableItems = menuItems.filter((item) => item.available);

    // Filter by dietary requirements
    const filteredItems = allFilters.length > 0
      ? availableItems.filter((item) =>
          allFilters.every((filter) =>
            item.dietary_tags.some((tag) =>
              tag.toLowerCase().includes(filter) ||
              filter.includes(tag.toLowerCase())
            )
          )
        )
      : availableItems;

    // Group by meal type
    const grouped: Record<string, typeof filteredItems> = {};
    for (const item of filteredItems) {
      const type = item.meal_type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(item);
    }

    // Build response message
    let message: string;

    if (filteredItems.length === 0) {
      message = allFilters.length > 0
        ? `I couldn't find menu items matching your dietary preferences (${allFilters.join(", ")}). However, our kitchen is always happy to accommodate special requests. Would you like me to note your dietary needs for the team?`
        : meal_type
          ? `I don't have ${meal_type} menu items available right now. Would you like to see our other meal options?`
          : "I'm having trouble loading the menu. Let me connect you with our team who can help.";
    } else if (meal_type) {
      const items = grouped[meal_type] || [];
      message = items.length > 0
        ? `For ${meal_type}, we have ${items.length} delicious options: ${items.map((i) => i.name).join(", ")}. Would you like details on any of these dishes?`
        : `We don't have specific ${meal_type} items listed right now, but our kitchen prepares fresh meals daily. Is there something specific you're hoping for?`;
    } else {
      const mealTypes = Object.keys(grouped);
      const totalItems = filteredItems.length;
      message = `We have ${totalItems} items available across ${mealTypes.join(", ")}. ${
        guestDietary.length > 0
          ? `I've filtered based on your dietary preferences (${guestDietary.join(", ")}). `
          : ""
      }Would you like to hear about a specific meal?`;
    }

    return NextResponse.json({
      menu: grouped,
      total_items: filteredItems.length,
      meal_types: Object.keys(grouped),
      filters_applied: allFilters,
      guest_dietary_preferences: guestDietary,
      message,
      items: filteredItems.map((item) => ({
        name: item.name,
        description: item.description,
        meal_type: item.meal_type,
        dietary_tags: item.dietary_tags,
      })),
    });
  } catch (error) {
    console.error("Get menu error:", error);

    return NextResponse.json(
      {
        menu: {},
        total_items: 0,
        message: "I'm having trouble accessing the menu right now. Our team can provide you with all the delicious options we have available. Would you like me to have someone reach out?",
        error: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
