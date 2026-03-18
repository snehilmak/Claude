import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST(): Promise<NextResponse> {
  await deleteSession();
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}

export async function GET(): Promise<NextResponse> {
  await deleteSession();
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
