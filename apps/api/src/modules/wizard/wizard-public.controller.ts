import { Body, Controller, Get, Logger, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { WizardEmployeeInput, WizardPublicSetupDto, WizardService } from './wizard.service';

// bcryptjs used via require() to avoid TS7016 (no @types/bcryptjs)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs') as { hash: (p: string, s: number) => Promise<string> };

/**
 * Public wizard endpoints — NO JwtAuthGuard.
 * Used by the standalone tenant onboarding flow at /wizard/:tenantId.
 * Security model: the tenantId is shared only by admin to the tenant.
 */
@Controller('wizard')
export class WizardPublicController {
  private readonly logger = new Logger(WizardPublicController.name);

  constructor(
    private readonly wizardService: WizardService,
    @InjectRepository(Employee)
    private readonly empRepo: Repository<Employee>,
  ) {}

  // ── Industry defaults (step 1 pre-selection) ──────────────────────────────

  @Get('defaults/:industry')
  getDefaults(@Param('industry') industry: string) {
    return this.wizardService.getIndustryDefaults(industry);
  }

  // ── Public receipt config — used by standalone receipt page ───────────────

  @Get('public/:tenantId')
  getPublicConfig(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.wizardService.findByTenant(tenantId);
  }

  // ── Full public wizard setup ───────────────────────────────────────────────

  @Post('public-setup')
  async publicSetup(@Body() rawBody: Record<string, unknown>) {
    // Cast the raw body — no class-validator here, validation is on the frontend
    const body = rawBody as unknown as WizardPublicSetupDto;

    this.logger.log(`Wizard public setup: tenant=${body.tenantId} industry=${body.industry}`);

    // 1. Upsert wizard config
    const config = await this.wizardService.upsertConfig(body);

    // 2. Create employees (skip duplicates silently)
    const employees = (body.employees ?? []) as WizardEmployeeInput[];
    const created: string[] = [];
    for (const emp of employees) {
      const exists = await this.empRepo.findOne({ where: { email: emp.email } });
      if (exists) { created.push(emp.email); continue; }

      const hashed = await bcrypt.hash(emp.password, 10);
      await this.empRepo.save(
        this.empRepo.create({
          firstName: emp.firstName,
          lastName:  emp.lastName,
          email:     emp.email,
          password:  hashed,
          role:      emp.role ?? 'cashier',
          tenantId:  body.tenantId,
          isActive:  true,
        }),
      );
      created.push(emp.email);
    }

    // 3. Mark wizard as completed
    await this.wizardService.complete(body.tenantId);

    return { success: true, wizardConfig: config.id, employees: created };
  }

}
