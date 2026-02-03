import Airtable from "airtable";

// Airtable Base IDs
const BASES = {
  AI_KNOWLEDGE: process.env.AIRTABLE_BASE_ID || "appnNWO7ArRjVGM2E",
  MASTER_GUEST: process.env.AIRTABLE_MASTER_GUEST_BASE_ID || "appYyHfcKqfRGpuGS",
  CURRENT_RETREAT: process.env.AIRTABLE_CURRENT_RETREAT_BASE_ID || "appa4qC7mHmhWVGd0",
} as const;

// Table names/IDs
const TABLES = {
  // AI Knowledge base
  CHECKIN_ENTRIES: process.env.AIRTABLE_TABLE_ID || "tblxMiNyQqEFNIRdY",
  TRANSCRIPTS: "TRANSCRIPTS",
  BOOKINGS: "BOOKINGS",

  // Master Guest base
  GUESTS: "Guests",
  RELATIONSHIPS: "Relationships",
  PREFERENCES: "Preferences",

  // Current Retreat base
  ROOMS: "Rooms",
  TREATMENTS: "Treatments",
  MENU: "Menu",
  SCHEDULE: "Schedule",
} as const;

// Initialize Airtable with API key
function getAirtableBase(baseId: string) {
  if (!process.env.AIRTABLE_API_KEY) {
    throw new Error("AIRTABLE_API_KEY environment variable not set");
  }
  const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
  return airtable.base(baseId);
}

// Type definitions for records
export interface CheckinEntry {
  id?: string;
  conversation_id: string;
  transcript?: string;
  transcript_object?: Array<{
    role: "user" | "agent";
    message: string;
    timestamp?: number;
  }>;
  first_name?: string;
  last_name?: string;
  email?: string;
  insights?: string;
  sentiment?: string;
  action_items?: string;
  created_at: string;
  analysis_status?: "pending" | "processing" | "completed" | "failed";
}

export interface GuestProfile {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  dietary_restrictions?: string[];
  allergies?: string[];
  room_preferences?: string[];
  past_visits?: number;
  total_checkins?: number;
  last_checkin_date?: string;
  wellness_goals?: string[];
  notes?: string;
}

export interface RoomAvailability {
  id: string;
  room_name: string;
  room_type: string;
  capacity: number;
  available_from: string;
  available_to: string;
  price_per_night: number;
}

export interface Treatment {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  category: string;
  available: boolean;
}

// AI Knowledge Base operations
export const aiKnowledge = {
  async createCheckinEntry(entry: Omit<CheckinEntry, "id">): Promise<CheckinEntry> {
    const base = getAirtableBase(BASES.AI_KNOWLEDGE);
    const record = await base(TABLES.CHECKIN_ENTRIES).create({
      conversation_id: entry.conversation_id,
      transcript: entry.transcript,
      "First name": entry.first_name,
      "Last Name": entry.last_name,
      email: entry.email,
      insights: entry.insights,
      sentiment: entry.sentiment,
      action_items: entry.action_items,
      created_at: entry.created_at,
      analysis_status: entry.analysis_status || "pending",
    });

    return {
      id: record.id,
      conversation_id: record.get("conversation_id") as string,
      transcript: record.get("transcript") as string | undefined,
      first_name: record.get("First name") as string | undefined,
      last_name: record.get("Last Name") as string | undefined,
      email: record.get("email") as string | undefined,
      created_at: record.get("created_at") as string,
    };
  },

  async updateCheckinEntry(
    recordId: string,
    updates: Partial<CheckinEntry>
  ): Promise<CheckinEntry> {
    const base = getAirtableBase(BASES.AI_KNOWLEDGE);

    const fields: Airtable.FieldSet = {};
    if (updates.transcript !== undefined) fields.transcript = updates.transcript;
    if (updates.insights !== undefined) fields.insights = updates.insights;
    if (updates.sentiment !== undefined) fields.sentiment = updates.sentiment;
    if (updates.action_items !== undefined) fields.action_items = updates.action_items;
    if (updates.analysis_status !== undefined) fields.analysis_status = updates.analysis_status;

    const record = await base(TABLES.CHECKIN_ENTRIES).update(recordId, fields);

    return {
      id: record.id,
      conversation_id: record.get("conversation_id") as string,
      transcript: record.get("transcript") as string | undefined,
      insights: record.get("insights") as string | undefined,
      sentiment: record.get("sentiment") as string | undefined,
      created_at: record.get("created_at") as string,
    };
  },

  async getCheckinEntry(recordId: string): Promise<CheckinEntry | null> {
    const base = getAirtableBase(BASES.AI_KNOWLEDGE);
    try {
      const record = await base(TABLES.CHECKIN_ENTRIES).find(recordId);
      return {
        id: record.id,
        conversation_id: record.get("conversation_id") as string,
        transcript: record.get("transcript") as string | undefined,
        first_name: record.get("First name") as string | undefined,
        last_name: record.get("Last Name") as string | undefined,
        email: record.get("email") as string | undefined,
        insights: record.get("insights") as string | undefined,
        sentiment: record.get("sentiment") as string | undefined,
        created_at: record.get("created_at") as string,
      };
    } catch {
      return null;
    }
  },

  async findCheckinByConversationId(conversationId: string): Promise<CheckinEntry | null> {
    const base = getAirtableBase(BASES.AI_KNOWLEDGE);
    const records = await base(TABLES.CHECKIN_ENTRIES)
      .select({
        filterByFormula: `{conversation_id} = "${conversationId}"`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) return null;

    const record = records[0];
    return {
      id: record.id,
      conversation_id: record.get("conversation_id") as string,
      transcript: record.get("transcript") as string | undefined,
      first_name: record.get("First name") as string | undefined,
      last_name: record.get("Last Name") as string | undefined,
      email: record.get("email") as string | undefined,
      insights: record.get("insights") as string | undefined,
      sentiment: record.get("sentiment") as string | undefined,
      created_at: record.get("created_at") as string,
    };
  },
};

// Master Guest Base operations
export const masterGuest = {
  async getGuestByEmail(email: string): Promise<GuestProfile | null> {
    const base = getAirtableBase(BASES.MASTER_GUEST);
    try {
      const records = await base(TABLES.GUESTS)
        .select({
          filterByFormula: `LOWER({email}) = LOWER("${email}")`,
          maxRecords: 1,
        })
        .firstPage();

      if (records.length === 0) return null;

      const record = records[0];
      return {
        id: record.id,
        email: record.get("email") as string,
        first_name: record.get("first_name") as string,
        last_name: record.get("last_name") as string,
        phone: record.get("phone") as string | undefined,
        dietary_restrictions: record.get("dietary_restrictions") as string[] | undefined,
        allergies: record.get("allergies") as string[] | undefined,
        room_preferences: record.get("room_preferences") as string[] | undefined,
        past_visits: record.get("past_visits") as number | undefined,
        total_checkins: record.get("total_checkins") as number | undefined,
        last_checkin_date: record.get("last_checkin_date") as string | undefined,
        wellness_goals: record.get("wellness_goals") as string[] | undefined,
        notes: record.get("notes") as string | undefined,
      };
    } catch {
      return null;
    }
  },

  async createGuest(guest: Omit<GuestProfile, "id">): Promise<GuestProfile> {
    const base = getAirtableBase(BASES.MASTER_GUEST);
    const record = await base(TABLES.GUESTS).create({
      email: guest.email,
      first_name: guest.first_name,
      last_name: guest.last_name,
      phone: guest.phone,
      dietary_restrictions: guest.dietary_restrictions,
      allergies: guest.allergies,
      room_preferences: guest.room_preferences,
      past_visits: guest.past_visits || 0,
      total_checkins: guest.total_checkins || 0,
      wellness_goals: guest.wellness_goals,
      notes: guest.notes,
    });

    return {
      id: record.id,
      email: record.get("email") as string,
      first_name: record.get("first_name") as string,
      last_name: record.get("last_name") as string,
    };
  },

  async updateGuest(
    recordId: string,
    updates: Partial<GuestProfile>
  ): Promise<GuestProfile> {
    const base = getAirtableBase(BASES.MASTER_GUEST);
    const record = await base(TABLES.GUESTS).update(recordId, updates);

    return {
      id: record.id,
      email: record.get("email") as string,
      first_name: record.get("first_name") as string,
      last_name: record.get("last_name") as string,
    };
  },

  async incrementCheckinCount(email: string): Promise<void> {
    const guest = await this.getGuestByEmail(email);
    if (guest?.id) {
      await this.updateGuest(guest.id, {
        total_checkins: (guest.total_checkins || 0) + 1,
        last_checkin_date: new Date().toISOString(),
      });
    }
  },
};

// Current Retreat Base operations
export const currentRetreat = {
  async checkAvailability(
    arrivalDate: string,
    departureDate: string,
    roomType?: string
  ): Promise<RoomAvailability[]> {
    const base = getAirtableBase(BASES.CURRENT_RETREAT);

    let filterFormula = `AND(
      {available_from} <= "${arrivalDate}",
      {available_to} >= "${departureDate}"
    )`;

    if (roomType) {
      filterFormula = `AND(
        {available_from} <= "${arrivalDate}",
        {available_to} >= "${departureDate}",
        {room_type} = "${roomType}"
      )`;
    }

    try {
      const records = await base(TABLES.ROOMS)
        .select({ filterByFormula: filterFormula })
        .firstPage();

      return records.map((record) => ({
        id: record.id,
        room_name: record.get("room_name") as string,
        room_type: record.get("room_type") as string,
        capacity: record.get("capacity") as number,
        available_from: record.get("available_from") as string,
        available_to: record.get("available_to") as string,
        price_per_night: record.get("price_per_night") as number,
      }));
    } catch {
      return [];
    }
  },

  async getTreatments(category?: string): Promise<Treatment[]> {
    const base = getAirtableBase(BASES.CURRENT_RETREAT);

    const options: Airtable.SelectOptions<Record<string, unknown>> = {};
    if (category) {
      options.filterByFormula = `{category} = "${category}"`;
    }

    try {
      const records = await base(TABLES.TREATMENTS).select(options).firstPage();

      return records.map((record) => ({
        id: record.id,
        name: record.get("name") as string,
        description: record.get("description") as string,
        duration_minutes: record.get("duration_minutes") as number,
        price: record.get("price") as number,
        category: record.get("category") as string,
        available: record.get("available") as boolean,
      }));
    } catch {
      return [];
    }
  },

  async getMenu(mealType?: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    meal_type: string;
    dietary_tags: string[];
    available: boolean;
  }>> {
    const base = getAirtableBase(BASES.CURRENT_RETREAT);

    const options: Airtable.SelectOptions<Record<string, unknown>> = {};
    if (mealType) {
      options.filterByFormula = `{meal_type} = "${mealType}"`;
    }

    try {
      const records = await base(TABLES.MENU).select(options).firstPage();

      return records.map((record) => ({
        id: record.id,
        name: record.get("name") as string,
        description: record.get("description") as string,
        meal_type: record.get("meal_type") as string,
        dietary_tags: record.get("dietary_tags") as string[],
        available: record.get("available") as boolean,
      }));
    } catch {
      return [];
    }
  },
};

// Export all modules
export { BASES, TABLES };
