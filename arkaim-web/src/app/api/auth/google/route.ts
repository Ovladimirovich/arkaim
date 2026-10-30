import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8642';

export async function GET() {
  // Перенаправляем на бэкенд, который начнёт OAuth flow с Google
  return NextResponse.redirect(`${BACKEND_URL}/auth/google`);
}