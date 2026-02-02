
import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function POST(req: Request) {
  try {
    const { conversationId, firstName, lastName, email } = await req.json();
    
    console.log('Received data:', { conversationId, firstName, lastName, email });
    
    if (!conversationId || !firstName || !lastName || !email) {
      console.log('Missing required fields:', { conversationId: !!conversationId, firstName: !!firstName, lastName: !!lastName, email: !!email });
      return NextResponse.json(
        { error: 'Conversation ID, first name, last name, and email are required' }, 
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.AIRTABLE_API_KEY) {
      console.error('Airtable credentials not configured');
      return NextResponse.json(
        { error: 'Airtable API key not configured' }, 
        { status: 500 }
      );
    }
    
    if (!process.env.AIRTABLE_BASE_ID) {
      console.error('Airtable base configuration missing');
      return NextResponse.json(
        { error: 'Airtable base ID not configured' }, 
        { status: 500 }
      );
    }

    const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
    const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
    
    console.log('Creating Airtable record...');
    
    // Map data to correct Airtable fields
    const record = await base('tblxMiNyQqEFNIRdY').create({
      'conversation_id': conversationId,
      'First name': firstName,
      'Last Name': lastName,
      'Name': `${firstName} ${lastName}`,
      'email': email
    });

    console.log('Successfully created Airtable record:', record.id);
    return NextResponse.json({ success: true, recordId: record.id });
  } catch (error: any) {
    console.error('Failed to create conversation record:', error);
    console.error('Error details:', {
      message: error?.message,
      status: error?.statusCode,
      error: error?.error,
      details: error
    });
    
    // Return more specific error in development
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Failed to create conversation record',
        details: isDev ? error?.message || error : undefined
      }, 
      { status: 500 }
    );
  }
}
