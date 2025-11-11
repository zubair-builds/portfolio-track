import { NextResponse } from 'next/server';
import { getUserFromCookies } from '@/lib/jwt';

export async function GET() {
  try {
    const user = await getUserFromCookies();
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ 
      user: { 
        email: user.email,
        name: user.name
      } 
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

