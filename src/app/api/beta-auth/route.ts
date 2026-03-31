// src/app/api/beta-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'talktrack-beta-auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const expectedPassword = process.env.PASSFORT_PASSWORD;

    if (!expectedPassword) {
      // No password configured, allow access
      return NextResponse.json({ success: true });
    }

    if (password === expectedPassword) {
      const response = NextResponse.json({ success: true });

      // Set auth cookie (expires in 30 days)
      response.cookies.set(COOKIE_NAME, 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
