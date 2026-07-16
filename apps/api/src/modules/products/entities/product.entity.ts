import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  costPrice: number;

  @Column({ type: 'int', default: 5 })
  minStock: number;

  @Column()
  category: string;

  @Column({ default: 'dona' })
  unit: string;

  @Column({ type: 'varchar', nullable: true })
  barcode: string | null;

  // 'uzs' yoki 'usd' — narx qaysi valyutada kiritilgan
  @Column({ type: 'varchar', length: 3, default: 'uzs' })
  priceCurrency: string;

  // USD narx (ixtiyoriy — faqat priceCurrency='usd' bo'lsa to'ldiriladi)
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, default: null })
  priceUsd: number | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
