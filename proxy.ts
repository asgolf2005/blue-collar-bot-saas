import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login");
  const isSignupPage = path.startsWith("/signup");
  const isOnboardingPage = path.startsWith("/onboarding");
  const isAdminPage = path.startsWith("/admin");
  const isTechPage = path.startsWith("/tech");
  const isCustomerPage = path.startsWith("/customer");
  const isApiRoute = path.startsWith("/api");
  const isAuthCallback = path.startsWith("/auth/callback");

  // Fast path: API/auth-callback/signup should not pay middleware auth + role DB lookup cost.
  if (isApiRoute || isSignupPage || isAuthCallback) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Fetch the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch role only for paths that need role-based redirects.
  let userRole: string | null = null;
  const needsRole =
    path === "/" ||
    isAuthPage ||
    isOnboardingPage ||
    isAdminPage ||
    isTechPage ||
    isCustomerPage;

  if (user && needsRole) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    userRole = profile?.role || null;
  }

  const isPublicPage = isAuthPage || isSignupPage || isAuthCallback;

  // Redirect users without role to onboarding (except if already there)
  if (user && !userRole && !isOnboardingPage) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Allow onboarding for authenticated users without role
  if (isOnboardingPage && user && !userRole) return response;

  // Redirect logged-in users away from auth pages
  if (isAuthPage && user && userRole) {
    if (userRole === "admin")
      return NextResponse.redirect(new URL("/admin/jobs", request.url));
    if (userRole === "tech")
      return NextResponse.redirect(new URL("/tech/today", request.url));
    if (userRole === "customer")
      return NextResponse.redirect(new URL("/customer", request.url));
  }

  // Redirect unauthenticated users to login
  if (!user && !isPublicPage && !isOnboardingPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based access control
  if (user && userRole) {
    if (userRole === "admin" && (isTechPage || isCustomerPage)) {
      return NextResponse.redirect(new URL("/admin/jobs", request.url));
    }

    if (userRole === "tech" && (isAdminPage || isCustomerPage)) {
      return NextResponse.redirect(new URL("/tech/today", request.url));
    }

    if (userRole === "customer" && (isAdminPage || isTechPage)) {
      return NextResponse.redirect(new URL("/customer", request.url));
    }

    // Redirect "/" to correct dashboard
    if (path === "/") {
      if (userRole === "admin")
        return NextResponse.redirect(new URL("/admin/jobs", request.url));
      if (userRole === "tech")
        return NextResponse.redirect(new URL("/tech/today", request.url));
      if (userRole === "customer")
        return NextResponse.redirect(new URL("/customer", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/onboarding/:path*",
  ],
};
