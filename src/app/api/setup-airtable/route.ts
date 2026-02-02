import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function POST() {
  try {
    // Verify Airtable configuration
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return NextResponse.json({ 
        error: 'Missing Airtable configuration. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables' 
      }, { status: 400 });
    }

    // Test the connection by attempting to access the base
    const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
    const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
    
    // Try to list a single record to verify the connection works
    await base('Guest Profiles').select({ maxRecords: 1 }).firstPage();
    
    return NextResponse.json({ success: true, message: 'Airtable base setup successful' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to setup Airtable base' }, { status: 500 });
  }
}