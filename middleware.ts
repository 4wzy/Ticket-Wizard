import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )
    
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Protected routes that require authentication
    const protectedRoutes = ['/manual-mode', '/guided-mode', '/settings', '/team']
    
    // Auth routes that authenticated users shouldn't access
    const authRoutes = ['/register', '/login']
    
    // Public routes that don't need auth  
    const publicRoutes = ['/']
    
    // Special handling for complete-signup - requires authenticated user without profile
    if (pathname === '/complete-signup') {
      if (!session) {
        // Not authenticated - redirect to login
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
      
      if (!session.user.email_confirmed_at) {
        // Email not confirmed - this is fine, let them see the email verification screen
        return response
      }
      
      // Check if user already has complete profile
      try {
        const profileResponse = await fetch(`${url.origin}/api/auth/setup?userId=${session.user.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (profileResponse.ok) {
          // User already has profile - redirect to app
          url.pathname = '/manual-mode'
          return NextResponse.redirect(url)
        }
        // If 404, user needs setup - allow access to complete-signup
      } catch (error) {
        console.error('Error checking profile in middleware for complete-signup:', error)
        // On error, allow access to complete-signup (better safe than sorry)
      }
      
      return response
    }

    // If user is authenticated and trying to access auth routes, redirect to app
    if (session && authRoutes.includes(pathname)) {
      // Check if user has completed profile setup
      try {
        const response = await fetch(`${url.origin}/api/auth/setup?userId=${session.user.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (response.ok) {
          // User has profile, redirect to main app
          url.pathname = '/manual-mode'
          return NextResponse.redirect(url)
        } else if (response.status === 404) {
          // User needs to complete profile setup
          url.pathname = '/complete-signup'
          return NextResponse.redirect(url)
        }
      } catch (error) {
        console.error('Error checking user profile in middleware:', error)
        // Fall back to redirecting to complete-signup
        url.pathname = '/complete-signup'
        return NextResponse.redirect(url)
      }
    }

    // If user is not authenticated and trying to access protected routes
    if (!session && protectedRoutes.some(route => pathname.startsWith(route))) {
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    // If user is authenticated but trying to access protected routes without profile
    if (session && protectedRoutes.some(route => pathname.startsWith(route))) {
      try {
        const response = await fetch(`${url.origin}/api/auth/setup?userId=${session.user.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (response.status === 404) {
          // User needs to complete profile setup
          url.pathname = '/complete-signup'
          return NextResponse.redirect(url)
        }
      } catch (error) {
        console.error('Error checking user profile for protected route:', error)
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}