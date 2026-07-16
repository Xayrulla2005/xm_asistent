import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

// ─── URL → entity name ────────────────────────────────────────────────────────

const ENTITY_MAP: Record<string, string> = {
  sales:      'sale',
  products:   'product',
  customers:  'customer',
  employees:  'employee',
  branches:   'branch',
  tenants:    'tenant',
  wizard:     'wizard',
  auth:       'auth',
  payments:   'payment',
  bugs:       'bug',
  debts:      'debt',
  suppliers:  'supplier',
  deliveries: 'delivery',
};

const METHOD_ACTION: Record<string, string> = {
  POST:   'CREATE',
  PUT:    'UPDATE',
  PATCH:  'UPDATE',
  DELETE: 'DELETE',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (s: string) => UUID_RE.test(s) || /^\d{4,}$/.test(s);

interface ParsedRoute {
  entity:      string;
  action:      string;
  urlEntityId: string | null;
}

function parseRoute(method: string, rawUrl: string): ParsedRoute {
  const path     = rawUrl.replace(/^\/api\//, '').split('?')[0];
  const segments = path.split('/').filter(Boolean);

  const base    = segments[0] ?? '';
  const seg1    = segments[1] ?? '';
  const seg2    = segments[2] ?? '';

  let entity      = ENTITY_MAP[base] ?? base;
  let action      = METHOD_ACTION[method] ?? method;
  let urlEntityId = isId(seg1) ? seg1 : null;

  // Special overrides
  if (base === 'auth') {
    if (seg1 === 'login')   { action = 'LOGIN';        }
    else if (seg1 === 'logout')  { action = 'LOGOUT';  }
    else if (seg1 === 'refresh') { action = 'TOKEN_REFRESH'; }
  }

  if (seg1 === 'export' || seg2 === 'export' || path.includes('/export')) {
    action = 'EXPORT';
  }
  if (seg1 === 'import' || seg2 === 'import' || path.includes('/import')) {
    action = 'IMPORT';
  }

  // /branches/transfers/list or /branches/transfers
  if (base === 'branches' && seg1 === 'transfers') {
    entity      = 'transfer';
    action      = method === 'POST' ? 'CREATE' : action;
    urlEntityId = isId(seg2) ? seg2 : null;
  }

  // /bugs/:id/comments
  if (base === 'bugs' && seg2 === 'comments') {
    entity = 'bug_comment';
    action = 'CREATE';
    urlEntityId = isId(seg1) ? seg1 : null;
  }

  // /wizard — always entity-level update
  if (base === 'wizard' && !urlEntityId) {
    urlEntityId = null;
  }

  return { entity, action, urlEntityId };
}

function extractLabel(body: unknown, entity: string): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const id = typeof b.id === 'string' ? b.id : null;

  if (entity === 'sale' && id) {
    return `Chek #${id.slice(0, 8).toUpperCase()}`;
  }

  return (
    (typeof b.receiptNumber === 'string' ? b.receiptNumber : null) ??
    (typeof b.name          === 'string' ? b.name          : null) ??
    (typeof b.fullName      === 'string' ? b.fullName      : null) ??
    (typeof b.title         === 'string' ? b.title         : null) ??
    (typeof b.email         === 'string' ? b.email         : null) ??
    (typeof b.phone         === 'string' ? b.phone         : null) ??
    (id ? id.slice(0, 8) : null)
  );
}

function sanitize(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') return null;
  try {
    // Strip password and token fields
    const raw = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
    delete raw.password;
    delete raw.accessToken;
    delete raw.refreshToken;
    return raw;
  } catch {
    return null;
  }
}

// ─── Interceptor ─────────────────────────────────────────────────────────────

interface AuditRequest {
  method:  string;
  url:     string;
  body:    unknown;
  user?:   { email?: string; role?: string; tenantId?: string };
  headers: Record<string, string | string[] | undefined>;
  ip?:     string;
  connection?: { remoteAddress?: string };
}

// Skip these paths — too noisy or not useful
const SKIP_PATHS = ['/audit', '/auth/refresh', '/bugs/stats', '/bugs?', '/uploads'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req    = context.switchToHttp().getRequest<AuditRequest>();
    const method = req.method.toUpperCase();
    const url    = req.url;

    // Only log mutating methods + GET export
    const isExport = url.includes('/export');
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!isMutating && !isExport) return next.handle();

    // Skip noisy / internal paths
    if (SKIP_PATHS.some((p) => url.includes(p))) return next.handle();

    const { entity, action, urlEntityId } = parseRoute(method, url);
    const tenantId   = (req.headers['x-tenant-id'] as string | undefined) ?? req.user?.tenantId ?? null;
    const ip         = req.ip ?? req.connection?.remoteAddress ?? null;
    const reqBody    = sanitize(req.body);

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        const body            = sanitize(responseBody);
        const resolvedId      = urlEntityId ?? (body?.id as string | undefined) ?? null;
        const entityLabel     = extractLabel(body, entity);
        const resolvedTenant  = tenantId ?? (body?.tenantId as string | undefined) ?? null;
        const tenantName      = (body?.tenantName as string | undefined) ?? null;

        this.auditService.log({
          tenantId:    resolvedTenant,
          tenantName,
          action,
          entity,
          entityId:    resolvedId,
          entityLabel,
          actorEmail:  req.user?.email  ?? null,
          actorRole:   req.user?.role   ?? null,
          ipAddress:   ip,
          before:      isMutating && action === 'UPDATE' ? reqBody : null,
          after:       body,
          meta:        { method, url },
        });
      }),
    );
  }
}
