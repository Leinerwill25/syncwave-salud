import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: Obtener información del usuario superadmin autenticado
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('analytics-admin-session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const sessionData = JSON.parse(sessionCookie.value);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: sessionData.adminId,
        username: sessionData.username,
        email: sessionData.email
      }
    });
  } catch (err) {
    console.error('[Analytics User API] Error:', err);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}

