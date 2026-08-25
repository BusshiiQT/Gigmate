export function getSafeRedirectUrl(next: string | null, origin: string) {
  const fallback = new URL("/dashboard", origin);

  if (!next?.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  try {
    const redirectUrl = new URL(next, origin);
    return redirectUrl.origin === origin ? redirectUrl : fallback;
  } catch {
    return fallback;
  }
}
