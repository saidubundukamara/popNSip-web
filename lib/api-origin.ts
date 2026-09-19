/**
 * Where the Express API actually lives, for code running on the Next server.
 *
 * The browser never uses this: it calls `/api/*` on its own origin, and the
 * rewrite in `next.config.ts` forwards the request. That keeps the staff
 * session cookie first-party on the web domain, which matters in production
 * where the web app and the API sit on unrelated domains (Vercel and Railway)
 * and a cross-site cookie would never be sent.
 *
 * Server components cannot use a relative URL, so they fetch this origin
 * directly and forward the cookie header by hand (`lib/api-server.ts`).
 * Deliberately not `NEXT_PUBLIC_`: nothing in the browser should know it.
 */
export const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";
