import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigureWizardDto } from './dto/configure-wizard.dto';
import { UpdateWizardDto } from './dto/update-wizard.dto';
import { WizardConfig } from './entities/wizard-config.entity';

@Injectable()
export class WizardService {
  constructor(
    @InjectRepository(WizardConfig)
    private readonly repo: Repository<WizardConfig>,
  ) {}

  async configure(dto: ConfigureWizardDto): Promise<WizardConfig> {
    const exists = await this.repo.findOne({ where: { tenantId: dto.tenantId } });
    if (exists) {
      throw new ConflictException(
        `Tenant #${dto.tenantId} uchun config allaqachon mavjud`,
      );
    }

    const config = this.repo.create({
      tenantId:  dto.tenantId,
      industry:  dto.industry,
      modules:   dto.modules,
      roles:     dto.roles,
      theme:       dto.theme       ?? {},
      dashboard:   dto.dashboard   ?? {},
      receipt:     dto.receipt     ?? {},
      permissions: dto.permissions ?? {},
      status:    dto.status,
    });
    return this.repo.save(config);
  }

  async findByTenant(tenantId: string): Promise<WizardConfig> {
    const config = await this.repo.findOne({ where: { tenantId } });
    if (!config) {
      throw new NotFoundException(`Tenant #${tenantId} uchun config topilmadi`);
    }
    return config;
  }

  async update(tenantId: string, dto: UpdateWizardDto): Promise<WizardConfig> {
    const config = await this.findByTenant(tenantId);
    Object.assign(config, dto);
    return this.repo.save(config);
  }
}
