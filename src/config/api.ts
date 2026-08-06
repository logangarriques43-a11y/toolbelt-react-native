/**
 * Backend API config.
 *
 * `API_BASE_URL` is the SAME production backend the Swift app points at
 * (hardcoded in ToolBelt/Core/APIService.swift as
 * `https://toolbelt-backend-dtvy.onrender.com/api/v1`) — so the RN app and the
 * Swift app hit the same server and the same accounts (your test login works).
 *
 * The value is read from EXPO_PUBLIC_API_BASE_URL (see .env) with the production
 * URL as a hard fallback, so it resolves even if the env var is missing. This is
 * the single import point for the API client.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://toolbelt-backend-dtvy.onrender.com/api/v1';
