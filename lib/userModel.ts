import type { ObjectId } from 'mongodb';

export interface UserDocument {
  _id?: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  portfolioInitialized?: boolean;
  watchlistInitialized?: boolean;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: Date;
  availableCash?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  name: string;
  email: string;
}

export interface UserInput {
  name: string;
  email: string;
  password: string;
}

export function normalizeUserInput(input: UserInput): UserInput {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
  };
}

export function toPublicUser(user: Pick<UserDocument, 'name' | 'email'>): PublicUser {
  return {
    name: user.name,
    email: user.email,
  };
}

