import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LandingSettings } from './landing-settings.entity';

@Injectable()
export class LandingSettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(LandingSettings)
    private readonly repo: Repository<LandingSettings>,
    private readonly ds: DataSource,
  ) {}

  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS landing_settings (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        key         VARCHAR     NOT NULL UNIQUE DEFAULT 'main',
        content     JSONB,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async getContent(): Promise<Record<string, unknown> | null> {
    const row = await this.repo.findOne({ where: { key: 'main' } });
    return row?.content ?? null;
  }

  async upsertContent(content: Record<string, unknown>): Promise<void> {
    const existing = await this.repo.findOne({ where: { key: 'main' } });
    if (existing) {
      existing.content = content;
      await this.repo.save(existing);
    } else {
      await this.repo.save(this.repo.create({ key: 'main', content }));
    }
  }
}
