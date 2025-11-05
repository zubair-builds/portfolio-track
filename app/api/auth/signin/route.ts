import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import clientPromise from '../../../../lib/mongodb';
import { normalizeUserInput, toPublicUser, UserDocument } from '../../../../lib/userModel';
import { setAuthCookie } from '../../../../lib/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
    }

    const normalized = normalizeUserInput({ name: '', email, password });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const users = db.collection<UserDocument>('users');

    const existing = await users.findOne({ email: normalized.email });
    if (!existing) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    const passwordMatches = await compare(normalized.password, existing.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    // Set JWT cookie
    await setAuthCookie({
      email: existing.email,
      name: existing.name,
    });

    return NextResponse.json({ user: toPublicUser(existing) }, { status: 200 });
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ message: 'Unable to sign in.' }, { status: 500 });
  }
}

