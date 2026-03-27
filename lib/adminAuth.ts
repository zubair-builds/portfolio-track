import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';

function getAdminAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function requireAdmin(request: Request): NextResponse | null {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowlist = getAdminAllowlist();
  if (allowlist.size === 0) {
    return NextResponse.json(
      { error: 'Admin access is not configured. Set ADMIN_EMAILS.' },
      { status: 500 },
    );
  }

  if (!allowlist.has(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}
