
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

export async function HEAD() {
  // Silent endpoint - normal Next.js development health checks
  return new NextResponse(null, { status: 200 });
}
