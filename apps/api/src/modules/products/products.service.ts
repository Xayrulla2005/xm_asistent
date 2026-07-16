import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  create(dto: CreateProductDto): Promise<Product> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(tenantId?: string): Promise<Product[]> {
    const where = tenantId ? { tenantId } : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id, tenantId } });
    if (!product) throw new NotFoundException(`Product #${id} topilmadi`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto, tenantId: string): Promise<Product> {
    const product = await this.findOne(id, tenantId);
    Object.assign(product, dto);
    return this.repo.save(product);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const product = await this.findOne(id, tenantId);
    await this.repo.remove(product);
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.tenantId = :tenantId', { tenantId })
      .orderBy('p.category', 'ASC')
      .getRawMany<{ category: string }>();
    return rows.map((r) => r.category).filter(Boolean);
  }

  async exportExcel(tenantId: string): Promise<{ buffer: Buffer; filename: string }> {
    const products = await this.findAll(tenantId);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Mahsulotlar');

    ws.columns = [
      { header: '№',           key: 'seq',           width: 6  },
      { header: 'Nomi',        key: 'name',          width: 28 },
      { header: 'Kategoriya',  key: 'category',      width: 18 },
      { header: 'Valyuta',     key: 'priceCurrency', width: 10 },
      { header: 'Narxi',       key: 'price',         width: 14 },
      { header: 'Narxi (USD)', key: 'priceUsd',      width: 14 },
      { header: 'Tan narxi',   key: 'costPrice',     width: 14 },
      { header: 'Miqdor',      key: 'quantity',      width: 10 },
      { header: "O'lchov",     key: 'unit',          width: 10 },
      { header: 'Barcode',     key: 'barcode',       width: 16 },
    ];

    ws.getRow(1).font      = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    products.forEach((p, idx) => {
      ws.addRow({
        seq:           idx + 1,
        name:          p.name,
        category:      p.category,
        priceCurrency: p.priceCurrency ?? 'uzs',
        price:         Number(p.price),
        priceUsd:      p.priceUsd != null ? Number(p.priceUsd) : '',
        costPrice:     Number(p.costPrice),
        quantity:      p.quantity,
        unit:          p.unit,
        barcode:       p.barcode || '—',
      });
    });

    const buffer   = Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer);
    const today    = new Date().toISOString().slice(0, 10);
    const filename = `mahsulotlar_${today}.xlsx`;
    return { buffer, filename };
  }

  async importExcel(tenantId: string, fileBuffer: Buffer): Promise<{ created: number; updated: number }> {
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(fileBuffer as any);
    const ws = wb.worksheets[0];

    let created = 0;
    let updated = 0;

    const rows: ExcelJS.Row[] = [];
    ws.eachRow((row, rowIndex) => {
      if (rowIndex > 1) rows.push(row);
    });

    for (const row of rows) {
      const name      = String(row.getCell(2).value ?? '').trim();
      const category  = String(row.getCell(3).value ?? '').trim();
      const price     = parseFloat(String(row.getCell(4).value ?? 0));
      const costPrice = parseFloat(String(row.getCell(5).value ?? 0));
      const quantity  = parseInt(String(row.getCell(6).value ?? 0), 10);
      const unit      = String(row.getCell(7).value ?? 'dona').trim();
      const barcode   = String(row.getCell(8).value ?? '').trim() || null;

      if (!name || isNaN(price)) continue;

      const existing = barcode
        ? await this.repo.findOne({ where: { tenantId, barcode } })
        : await this.repo.findOne({ where: { tenantId, name } });

      if (existing) {
        Object.assign(existing, { name, category, price, costPrice, quantity, unit, barcode: barcode ?? null });
        await this.repo.save(existing);
        updated++;
      } else {
        await this.repo.save(
          this.repo.create({ tenantId, name, category, price, costPrice, quantity, unit, barcode: barcode ?? null }),
        );
        created++;
      }
    }

    return { created, updated };
  }
}
