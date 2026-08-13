// Machine-readable codes from server/utils/AppError.js's ErrorCodes registry,
// as documented in API_REFERENCE.md. INVALID_INPUT and INVALID_ID are real
// codes the API returns but aren't in the registry object itself (they're
// string literals passed straight to AppError) — included here anyway since
// they show up in real responses.
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_ID: "INVALID_ID",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE_KEY: "DUPLICATE_KEY",
  DOMAIN_NOT_VERIFIED: "DOMAIN_NOT_VERIFIED",
  PLAN_LIMIT_REACHED: "PLAN_LIMIT_REACHED",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_INPUT: "INVALID_INPUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  // POST /api/billing/create-checkout returns this (409) when the user
  // already has a live Stripe subscription — checkout can't start a second
  // one on top of it, they need the billing portal instead.
  ALREADY_SUBSCRIBED: "ALREADY_SUBSCRIBED",
  // Not in the documented registry, but a real code the API returns (503)
  // whenever the Claude API call itself fails for any reason — auth,
  // rate limit, overload, timeout — server/services/ai/assistant.js wraps
  // all of them into this one code rather than a generic 500.
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
};

const FALLBACK_MESSAGES = {
  [ErrorCodes.VALIDATION_ERROR]: "Some of the information you entered isn't valid.",
  [ErrorCodes.INVALID_ID]: "That link or ID doesn't look right.",
  [ErrorCodes.UNAUTHORIZED]: "You need to sign in to continue.",
  [ErrorCodes.INVALID_TOKEN]: "That link is invalid or has already been used.",
  [ErrorCodes.TOKEN_EXPIRED]: "Your session has expired. Please sign in again.",
  [ErrorCodes.FORBIDDEN]: "You don't have permission to do that.",
  [ErrorCodes.NOT_FOUND]: "We couldn't find that.",
  [ErrorCodes.DUPLICATE_KEY]: "That already exists.",
  [ErrorCodes.DOMAIN_NOT_VERIFIED]: "Verify domain ownership before running a deep scan.",
  [ErrorCodes.PLAN_LIMIT_REACHED]: "You've hit a limit on your current plan.",
  [ErrorCodes.RATE_LIMITED]: "Too many requests — please slow down and try again.",
  [ErrorCodes.INVALID_INPUT]: "That action isn't allowed right now.",
  [ErrorCodes.INTERNAL_ERROR]: "Something went wrong on our end. Please try again.",
  [ErrorCodes.ALREADY_SUBSCRIBED]: "You already have an active subscription — manage it from the billing portal.",
  [ErrorCodes.AI_UNAVAILABLE]: "The assistant is temporarily unavailable. Please try again.",
};

/**
 * Every response is one of:
 *   { success: true, data: {...} }
 *   { success: true, message: "..." }
 *   { success: false, error: "...", code: "MACHINE_CODE" }
 * Pass in an axios response; get back whatever the endpoint actually handed
 * over (the `data` payload, or `{ message }` for message-only endpoints).
 */
export function unwrapResponse(response) {
  const body = response?.data;

  if (body?.data !== undefined) {
    return body.data;
  }

  if (body?.message !== undefined) {
    return { message: body.message };
  }

  return body;
}

/**
 * Pass in a caught axios error; get back { code, status, message } so
 * components can branch on `code` instead of string-matching `message`.
 * `code` is null for network errors and for the one documented endpoint
 * (POST /webhooks/stripe) whose error body omits it — not called from the
 * frontend, but the helper stays safe either way.
 */
export function getApiError(error) {
  if (!error?.response) {
    return {
      code: null,
      status: null,
      message: error?.message || "Network error — please check your connection.",
    };
  }

  const { status, data: body } = error.response;
  const code = body?.code ?? null;
  const message = body?.error || FALLBACK_MESSAGES[code] || FALLBACK_MESSAGES.INTERNAL_ERROR;

  return { code, status, message };
}
