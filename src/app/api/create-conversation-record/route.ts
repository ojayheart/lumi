import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function POST(req: Request) {
  try {
    const { conversationId, firstName, lastName, email } = await req.json();

    if (!conversationId || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Conversation ID, first name, last name, and email are required' },
        { status: 400 }
      );
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return NextResponse.json(
        { error: 'Airtable API key not configured' },
        { status: 500 }
      );
    }

    if (!process.env.AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: 'Airtable base ID not configured' },
        { status: 500 }
      );
    }

    if (!process.env.AIRTABLE_TABLE_ID) {
      return NextResponse.json(
        { error: 'Airtable table ID not configured' },
        { status: 500 }
      );
    }

    const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
    const base = airtable.base(process.env.AIRTABLE_BASE_ID);

    const record = await base(process.env.AIRTABLE_TABLE_ID).create({
      'conversation_id': conversationId,
      'First name': firstName,
      'Last Name': lastName,
      'Name': `${firstName} ${lastName}`,
      'email': email
    });

    return NextResponse.json({ success: true, recordId: record.id });
  } catch (error: unknown) {
    console.error('Failed to create conversation record:', error);

    return NextResponse.json(
      { error: 'Failed to create conversation record' },
      { status: 500 }
    );
  }
}
