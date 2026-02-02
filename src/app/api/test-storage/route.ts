import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({ 
    message: "Storage functionality has been removed from this application."
  }, { status: 200 });
}