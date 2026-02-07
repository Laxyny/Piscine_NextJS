import { NextResponse } from 'next/server';
import { getAdminAuth } from './firebaseAdmin';

export async function getAuthFromRequest(request) {
  const auth = getAdminAuth();
  if (!auth) return null;
  const header = request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email || null };
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
}
