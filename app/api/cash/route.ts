import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { UserDocument } from '../../../lib/userModel';
import { getUserFromRequest } from '../../../lib/jwt';

function getUserIdFromRequest(request: NextRequest): string | null {
  const jwtUser = getUserFromRequest(request);
  return jwtUser?.email ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const users = db.collection<UserDocument>('users');

    const user = await users.findOne({ email: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    const availableCash = user.availableCash ?? 0;

    return NextResponse.json({ availableCash });
  } catch (error) {
    console.error('Error fetching cash balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash balance.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a number.' },
        { status: 400 }
      );
    }

    if (amount < 0) {
      return NextResponse.json(
        { error: 'Cash balance cannot be negative.' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const users = db.collection<UserDocument>('users');

    const result = await users.updateOne(
      { email: userId },
      {
        $set: {
          availableCash: amount,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ availableCash: amount });
  } catch (error) {
    console.error('Error updating cash balance:', error);
    return NextResponse.json(
      { error: 'Failed to update cash balance.' },
      { status: 500 }
    );
  }
}


