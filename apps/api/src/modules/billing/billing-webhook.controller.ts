import { Body, Controller, Headers, Logger, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import * as crypto from 'crypto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingCycle, PaymentMethod, PlanType } from './entities/subscription.entity';
import { BillingService, PLAN_LIMITS } from './billing.service';
import { RecordPaymentDto } from './dto/billing.dto';

// ─── Payment provider credentials (required via environment variables) ────────
function requireEnv(name: string, devFallback?: string): string {
  const val = process.env[name];
  if (val) return val;
  if (process.env['NODE_ENV'] !== 'production' && devFallback) return devFallback;
  throw new Error(`Muhit o'zgaruvchisi ${name} o'rnatilmagan. To'lov tizimi ishlamaydi.`);
}

const CLICK_SERVICE_ID  = requireEnv('CLICK_SERVICE_ID',  '12345');
const CLICK_MERCHANT_ID = requireEnv('CLICK_MERCHANT_ID', '12345');
const CLICK_SECRET_KEY  = requireEnv('CLICK_SECRET_KEY',  'click_secret_dev');
const PAYME_MERCHANT_ID = requireEnv('PAYME_MERCHANT_ID', 'payme_merchant_dev');
const PAYME_SECRET_KEY  = requireEnv('PAYME_SECRET_KEY',  'payme_secret_dev');
const FRONTEND_URL      = process.env['FRONTEND_URL'] ?? 'http://localhost:4300';

const SEP = '::';

// ─── Signature helpers ────────────────────────────────────────────────────────

/**
 * Click SIGN_STRING: MD5(click_trans_id + service_id + secret_key +
 *                        merchant_trans_id + amount + action + sign_time)
 * See: https://docs.click.uz/api-click-merchant/#sign_string
 */
function verifyClickSignature(body: Record<string, unknown>): void {
  const received = body['sign_string'] as string | undefined;
  if (!received) throw new UnauthorizedException('Click: sign_string yo\'q');

  const raw = [
    body['click_trans_id'],
    CLICK_SERVICE_ID,
    CLICK_SECRET_KEY,
    body['merchant_trans_id'],
    body['amount'],
    body['action'],
    body['sign_time'],
  ].join('');

  const expected = crypto.createHash('md5').update(raw).digest('hex');
  if (received !== expected) throw new UnauthorizedException('Click: noto\'g\'ri imzo');
}

/**
 * Payme Basic auth: Authorization: Basic base64(merchant_id:secret_key)
 * See: https://developer.help.paycom.uz/protokol-merchant-api
 */
function verifyPaymeAuth(authorization: string | undefined): void {
  if (!authorization) throw new UnauthorizedException('Payme: Authorization sarlavhasi yo\'q');
  const expected = 'Basic ' + Buffer.from(`${PAYME_MERCHANT_ID}:${PAYME_SECRET_KEY}`).toString('base64');
  if (authorization !== expected) throw new UnauthorizedException('Payme: noto\'g\'ri autentifikatsiya');
}

// ─── Request body types ───────────────────────────────────────────────────────

interface PaymentInitBody {
  tenantId: string;
  amount:   number;
  planType: string;
  cycle:    string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * Public webhook receiver — NO JwtAuthGuard.
 * Click and Payme call these endpoints from their servers using their own
 * HMAC / Basic-auth schemes, not our JWT tokens.
 */
@Controller('billing')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);

  constructor(private readonly billingService: BillingService) {}

  // ── Click payment URL creation (tenant-initiated, requires JWT) ───────────

  @Post('click/create')
  @UseGuards(JwtAuthGuard)
  async createClickPayment(
    @CurrentUser() user: { tenantId: string },
    @Body() body: PaymentInitBody,
  ) {
    const tenantId = user.tenantId;
    const { planType, cycle } = body;

    await this.billingService.requestPlanChange(
      tenantId,
      planType as PlanType,
      cycle as BillingCycle,
    );

    // Derive amount from server-side plan config (UZS) — never trust client amount
    const limits = PLAN_LIMITS[planType as PlanType];
    const amount = cycle === BillingCycle.YEARLY ? limits.priceYearly : limits.priceMonthly;

    const merchant_trans_id = `${tenantId}${SEP}${planType}${SEP}${cycle}`;
    const returnUrl = encodeURIComponent(`${FRONTEND_URL}/subscription`);

    const payment_url = [
      'https://my.click.uz/services/pay',
      `?service_id=${CLICK_SERVICE_ID}`,
      `&merchant_id=${CLICK_MERCHANT_ID}`,
      `&amount=${amount}`,
      `&transaction_param=${encodeURIComponent(merchant_trans_id)}`,
      `&return_url=${returnUrl}`,
    ].join('');

    this.logger.log(`Click payment initiated: tenantId=${tenantId} amount=${amount} (UZS)`);
    return { payment_url, merchant_trans_id };
  }

  // ── Payme payment URL creation (tenant-initiated, requires JWT) ───────────

  @Post('payme/create')
  @UseGuards(JwtAuthGuard)
  async createPaymePayment(
    @CurrentUser() user: { tenantId: string },
    @Body() body: PaymentInitBody,
  ) {
    const tenantId = user.tenantId;
    const { planType, cycle } = body;

    await this.billingService.requestPlanChange(
      tenantId,
      planType as PlanType,
      cycle as BillingCycle,
    );

    // Derive amount from server-side plan config (UZS) — never trust client amount
    const limits = PLAN_LIMITS[planType as PlanType];
    const amount = cycle === BillingCycle.YEARLY ? limits.priceYearly : limits.priceMonthly;

    // Payme amounts are in tiyin (1 UZS = 100 tiyin)
    const amount_tiyin = amount * 100;
    const params = [
      `m=${PAYME_MERCHANT_ID}`,
      `ac.tenantId=${tenantId}`,
      `ac.planType=${planType}`,
      `ac.cycle=${cycle}`,
      `a=${amount_tiyin}`,
    ].join(';');
    const encoded     = Buffer.from(params).toString('base64');
    const payment_url = `https://checkout.paycom.uz/${encoded}`;

    this.logger.log(`Payme payment initiated: tenantId=${tenantId} amount=${amount}`);
    return { payment_url };
  }

  // ── Click webhook receiver ─────────────────────────────────────────────────

  @Post('click/webhook')
  async clickWebhook(@Body() body: Record<string, unknown>) {
    verifyClickSignature(body);
    this.logger.log(`Click webhook: ${JSON.stringify(body)}`);

    // action=3 means perform_transaction (payment confirmed)
    if (body['action'] === 3) {
      const merchantTransId = (body['merchant_trans_id'] as string) ?? '';
      const parts = merchantTransId.split(SEP);

      if (parts.length === 3) {
        const [tenantId, planType] = parts;
        const amount = Number(body['amount'] ?? 0);
        const clickTxId = body['click_trans_id'] as string | undefined;

        try {
          const dto: RecordPaymentDto = {
            amount,
            method:        PaymentMethod.CLICK,
            transactionId: clickTxId,
            description:   `Click: ${planType} tarifi`,
          };
          await this.billingService.recordPayment(tenantId, dto);
          await this.billingService.approvePlanChange(tenantId);
          this.logger.log(`Click payment approved: tenant=${tenantId} plan=${planType}`);
        } catch (err) {
          this.logger.error(`Click webhook processing error: ${String(err)}`);
        }
      }
    }

    return { error: 0, error_note: 'Success' };
  }

  // ── Payme webhook receiver ─────────────────────────────────────────────────

  @Post('payme/webhook')
  async paymeWebhook(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>,
  ) {
    verifyPaymeAuth(authorization);
    this.logger.log(`Payme webhook: ${JSON.stringify(body)}`);

    const method = body['method'] as string | undefined;

    // PerformTransaction = payment confirmed
    if (method === 'PerformTransaction') {
      const params = (body['params'] as Record<string, unknown>) ?? {};
      const account = (params['account'] as Record<string, unknown>) ?? {};
      const tenantId = account['tenantId'] as string | undefined;
      const planType  = account['planType']  as string | undefined;
      const cycle     = account['cycle']     as string | undefined;
      const amount    = Number((params['amount'] as number | undefined) ?? 0) / 100; // tiyin → UZS

      if (tenantId && planType && cycle) {
        try {
          const dto: RecordPaymentDto = {
            amount,
            method:        PaymentMethod.PAYME,
            transactionId: params['transaction'] as string | undefined,
            description:   `Payme: ${planType} tarifi`,
          };
          await this.billingService.recordPayment(tenantId, dto);
          await this.billingService.approvePlanChange(tenantId);
          this.logger.log(`Payme payment approved: tenant=${tenantId} plan=${planType}`);
        } catch (err) {
          this.logger.error(`Payme webhook processing error: ${String(err)}`);
        }
      }
    }

    return { result: { allow: 1 } };
  }
}
