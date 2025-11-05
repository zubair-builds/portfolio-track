import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import clientPromise from '../../../../lib/mongodb';
import { normalizeUserInput, toPublicUser, UserDocument } from '../../../../lib/userModel';
import { setAuthCookie } from '../../../../lib/jwt';

const MIN_PASSWORD_LENGTH = 6;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body ?? {};

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` },
        { status: 400 },
      );
    }

    const normalized = normalizeUserInput({ name, email, password });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const users = db.collection<UserDocument>('users');
    await users.createIndex({ email: 1 }, { unique: true });

    const existing = await users.findOne({ email: normalized.email });
    if (existing) {
      return NextResponse.json({ message: 'An account with this email already exists.' }, { status: 409 });
    }

    const now = new Date();
    const passwordHash = await hash(normalized.password, 10);

    const userDocument: UserDocument = {
      name: normalized.name,
      email: normalized.email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    await users.insertOne(userDocument);

    // Set JWT cookie
    await setAuthCookie({
      email: userDocument.email,
      name: userDocument.name,
    });

    return NextResponse.json({ user: toPublicUser(userDocument) }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ message: 'Unable to create account.' }, { status: 500 });
  }
}

