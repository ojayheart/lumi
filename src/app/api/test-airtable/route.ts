import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function POST(req: Request) {
  try {
    const { fileName } = await req.json();

    // Initialize Airtable
    const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
    const base = airtable.base(process.env.AIRTABLE_BASE_ID!);

    const record = await base('tblNUhkqNOJqgfBjs').update('recaPctULj8pcTAus', {
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}