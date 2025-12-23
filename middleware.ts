import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = request.nextUrl;

    // Auth pages (redirect to home if logged in)
    const isAuthPage = pathname.startsWith('/auth');

    if (isAuthPage) {
        if (token) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Protected routes (redirect to signin if not logged in)
    const protectedRoutes = ['/notifications', '/dm', '/new-entry', '/reports', '/bans', '/profile'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute) {
        if (!token) {
            const url = new URL('/auth/signin', request.url);
            url.searchParams.set('callbackUrl', encodeURI(request.url));
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/auth/:path*',
        '/notifications/:path*',
        '/dm/:path*',
        '/new-entry/:path*',
        '/reports/:path*',
        '/bans/:path*',
        '/profile/:path*'
    ],
};
