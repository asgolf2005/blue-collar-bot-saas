import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_error`)
    }

    // Get the user to determine where to redirect
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Get user profile to check role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      // Redirect based on role
      if (profile?.role === 'admin') {
        return NextResponse.redirect(`${origin}/admin/jobs`)
      } else if (profile?.role === 'tech') {
        return NextResponse.redirect(`${origin}/tech/today`)
      } else if (profile?.role === 'customer') {
        return NextResponse.redirect(`${origin}/customer`)
      } else {
        // No profile yet, redirect to onboarding
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  // If no code or something went wrong, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
