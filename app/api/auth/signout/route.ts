import { NextResponse } from 'next/server';
import { clearAuthCookie } from '../../../../lib/jwt';

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json({ message: 'Unable to sign out.' }, { status: 500 });
  }
}

