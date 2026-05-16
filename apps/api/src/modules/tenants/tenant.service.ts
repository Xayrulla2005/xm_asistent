import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const slug = dto.slug ?? this.toSlug(dto.name);
    await this.assertSlugFree(slug);

    const tenant = this.repo.create({
      name: dto.name,
      slug,
      ownerId: dto.ownerId,
      config: dto.config ?? {},
      isActive: dto.isActive ?? true,
    });
    const saved = await this.repo.save(tenant);

    await this.createTenantSchema(slug);

    return saved;
  }

  findAll(): Promise<Tenant[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant #${id} topilmadi`);
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (dto.name && !dto.slug) {
      dto.slug = this.toSlug(dto.name);
    }

    if (dto.slug && dto.slug !== tenant.slug) {
      await this.assertSlugFree(dto.slug);
    }

    Object.assign(tenant, dto);
    return this.repo.save(tenant);
  }

  async createTenantSchema(slug: string): Promise<void> {
    await this.dataSource.query(
      `CREATE SCHEMA IF NOT EXISTS "${slug}"`,
    );
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async assertSlugFree(slug: string): Promise<void> {
    const exists = await this.repo.findOne({ where: { slug } });
    if (exists) throw new ConflictException(`"${slug}" slug allaqachon band`);
  }
}
