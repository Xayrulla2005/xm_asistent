const API_URL = 'http://localhost:3000/api/bugs';

function decodeJwt(token: string): { email?: string } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export interface BugPayload {
  type: 'frontend_error' | 'api_error' | 'user_report';
  message: string;
  stack?: string | null;
  url?: string;
  tenantId?: string | null;
  userEmail?: string | null;
}

export function reportBug(
  error: { message: string; stack?: string },
  context?: string,
  extras?: { type?: BugPayload['type']; url?: string },
): void {
  try {
    const tenantId  = localStorage.getItem('crm_tenantId');
    const token     = localStorage.getItem('crm_accessToken');
    const userEmail = token ? (decodeJwt(token)?.email ?? null) : null;

    const payload: BugPayload = {
      type:      extras?.type ?? 'frontend_error',
      message:   context ? `[${context}] ${error.message}` : error.message,
      stack:     error.stack ?? null,
      url:       extras?.url ?? window.location.pathname,
      tenantId:  tenantId ?? null,
      userEmail,
    };

    // Use fetch directly — avoids circular dependency with the axios instance
    void fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch {
    // fail silently — bug reporter must never throw
  }
}
