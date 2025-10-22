// middleware.ts (temporal para dev)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
	if (process.env.NODE_ENV !== 'production') {
		if (req.nextUrl.pathname.startsWith('/dashboard/clinic/invites')) {
			console.log('>>> middleware cookie header for /dashboard/clinic/invites:', req.headers.get('cookie'));
		}
	}
	return NextResponse.next();
}

export const config = {
	matcher: ['/dashboard/clinic/invites'],
};
