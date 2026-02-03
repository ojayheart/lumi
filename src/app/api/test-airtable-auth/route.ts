import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function GET() {
  try {
    const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
    const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
    
    const tableId = process.env.AIRTABLE_TABLE_ID || 'Guest Profiles';
    const tables = await base(tableId).select({ maxRecords: 1 }).firstPage();
    
    return NextResponse.json({
      success: true,
      message: 'Airtable authorization successful',
      credentialsConfigured: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID),
      records: tables.length,
      recordSample: tables.length > 0 ? tables[0].fields : null
    });
  } catch (error: unknown) {
    console.error('Airtable authorization error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      credentialsConfigured: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID)
    }, { status: 401 });
  }
}
