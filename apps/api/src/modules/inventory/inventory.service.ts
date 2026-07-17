import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateProductDto,
  CreateWarehouseDto,
  StockAdjustDto,
  StockTransferDto,
  CreateBatchDto,
  CreateStockTakeDto,
  StockTakeLineDto,
} from './dto/inventory.dto';
import { TxType, ValuationMethod, StockTakeStatus } from '@acc/shared-types';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- Products ----------
  async createProduct(companyId: string, dto: CreateProductDto, actorId: string) {
    try {
      const product = await this.prisma.product.create({
        data: {
          ...dto,
          reorderLevel: dto.reorderLevel ?? 0,
          valuation: dto.valuation ?? ValuationMethod.WEIGHTED_AVG,
          companyId,
        },
      });
      await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Product', entityId: product.id, after: dto });
      return product;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A product with this SKU already exists.');
      }
      throw e;
    }
  }

  async listProducts(companyId: string) {
    return this.prisma.product.findMany({ where: { companyId } });
  }

  async getProduct(companyId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async updateProduct(companyId: string, id: string, dto: CreateProductDto, actorId: string) {
    const p = await this.prisma.product.findFirst({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Product not found');
    const updated = await this.prisma.product.update({ where: { id }, data: { ...dto } });
    await this.audit.log({ userId: actorId, action: 'UPDATE', entity: 'Product', entityId: id, after: dto });
    return updated;
  }

  async deleteProduct(companyId: string, id: string, actorId: string) {
    const p = await this.prisma.product.findFirst({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id } });
    await this.audit.log({ userId: actorId, action: 'DELETE', entity: 'Product', entityId: id });
    return { id };
  }

  // ---------- Warehouses ----------
  async createWarehouse(companyId: string, dto: CreateWarehouseDto, actorId: string) {
    const wh = await this.prisma.warehouse.create({ data: { ...dto, companyId } });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Warehouse', entityId: wh.id, after: dto });
    return wh;
  }

  async listWarehouses(companyId: string) {
    return this.prisma.warehouse.findMany({ where: { companyId } });
  }

  async updateWarehouse(companyId: string, id: string, dto: CreateWarehouseDto, actorId: string) {
    const wh = await this.prisma.warehouse.findFirst({ where: { id, companyId } });
    if (!wh) throw new NotFoundException('Warehouse not found');
    const updated = await this.prisma.warehouse.update({ where: { id }, data: { ...dto } });
    await this.audit.log({ userId: actorId, action: 'UPDATE', entity: 'Warehouse', entityId: id, after: dto });
    return updated;
  }

  async deleteWarehouse(companyId: string, id: string, actorId: string) {
    const wh = await this.prisma.warehouse.findFirst({ where: { id, companyId } });
    if (!wh) throw new NotFoundException('Warehouse not found');
    await this.prisma.warehouse.delete({ where: { id } });
    await this.audit.log({ userId: actorId, action: 'DELETE', entity: 'Warehouse', entityId: id });
    return { id };
  }

  // ---------- Stock queries ----------
  async getStockLevel(productId: string, warehouseId?: string, tx: TransactionClient = this.prisma) {
    const agg = await tx.stockLedger.aggregate({
      where: warehouseId ? { productId, warehouseId } : { productId },
      _sum: { quantity: true },
    });
    return { productId, warehouseId: warehouseId ?? null, quantity: agg._sum.quantity ?? 0 };
  }

  /** Fire a low-stock notification if any product falls at/below reorder level. */
  private async maybeAlertLowStock(companyId: string, tx: TransactionClient = this.prisma) {
    const low = await this.getLowStock(companyId, tx);
    if (low.length) await this.notifications.lowStockAlert(companyId, low, tx);
  }

  async getLowStock(companyId: string, tx: TransactionClient = this.prisma) {
    const products = await tx.product.findMany({ where: { companyId } });
    const low: Array<{ sku: string; name: string; reorderLevel: number; quantity: number }> = [];
    for (const p of products) {
      const level = await this.getStockLevel(p.id, undefined, tx);
      if (Number(level.quantity) <= p.reorderLevel) {
        low.push({ sku: p.sku, name: p.name, reorderLevel: p.reorderLevel, quantity: Number(level.quantity) });
      }
    }
    return low;
  }

  // ---------- Stock mutations (atomic via request transaction) ----------
  async adjustStock(companyId: string, dto: StockAdjustDto, actorId: string, tx: TransactionClient = this.prisma) {
    const product = await tx.product.findFirst({ where: { id: dto.productId, companyId } });
    if (!product) throw new NotFoundException('Product not found');

    const warehouse = await tx.warehouse.findFirst({ where: { id: dto.warehouseId, companyId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    if (dto.quantity < 0) {
      const level = await this.getStockLevel(dto.productId, dto.warehouseId);
      if (Number(level.quantity) + dto.quantity < 0) {
        throw new BadRequestException('Insufficient stock for adjustment');
      }
    }

    const entry = await tx.stockLedger.create({
      data: {
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        quantity: dto.quantity,
        type: TxType.ADJUST,
        reference: `ADJ:${dto.reason}`,
      },
    });
    await this.audit.log({ userId: actorId, action: 'STOCK_ADJUST', entity: 'StockLedger', entityId: entry.id, after: dto });
    await this.maybeAlertLowStock(companyId, tx);
    return entry;
  }

  async transferStock(companyId: string, dto: StockTransferDto, actorId: string, tx: TransactionClient = this.prisma) {
    const product = await tx.product.findFirst({ where: { id: dto.productId, companyId } });
    if (!product) throw new NotFoundException('Product not found');

    const from = await tx.warehouse.findFirst({ where: { id: dto.fromWarehouseId, companyId } });
    const to = await tx.warehouse.findFirst({ where: { id: dto.toWarehouseId, companyId } });
    if (!from || !to) throw new NotFoundException('Warehouse not found');

    const level = await this.getStockLevel(dto.productId, dto.fromWarehouseId);
    if (Number(level.quantity) < dto.quantity) {
      throw new BadRequestException('Insufficient stock in source warehouse');
    }

    const ref = `TRANSFER:${dto.productId}`;
    const [out, inn] = await Promise.all([
      tx.stockLedger.create({
        data: { productId: dto.productId, warehouseId: dto.fromWarehouseId, quantity: -dto.quantity, type: TxType.TRANSFER_OUT, reference: ref },
      }),
      tx.stockLedger.create({
        data: { productId: dto.productId, warehouseId: dto.toWarehouseId, quantity: dto.quantity, type: TxType.TRANSFER_IN, reference: ref },
      }),
    ]);
    await this.audit.log({ userId: actorId, action: 'STOCK_TRANSFER', entity: 'StockLedger', entityId: out.id, after: dto });
    await this.maybeAlertLowStock(companyId, tx);
    return { out, inn };
  }

  // ---------- Phase 2: Batch / expiry (FR2.6, FR2.7) ----------
  async addBatch(companyId: string, dto: CreateBatchDto, actorId: string, tx: TransactionClient = this.prisma) {
    const product = await tx.product.findFirst({ where: { id: dto.productId, companyId } });
    if (!product) throw new NotFoundException('Product not found');
    const wh = await tx.warehouse.findFirst({ where: { id: dto.warehouseId, companyId } });
    if (!wh) throw new NotFoundException('Warehouse not found');

    const batch = await tx.stockBatch.create({
      data: {
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        batchNo: dto.batchNo,
        quantity: dto.quantity,
        costPrice: dto.costPrice,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        companyId,
      },
    });
    // Mirror into stock ledger for live qty
    await tx.stockLedger.create({
      data: { productId: dto.productId, warehouseId: dto.warehouseId, quantity: dto.quantity, type: TxType.PURCHASE_IN, reference: `BATCH:${batch.id}` },
    });
    await this.audit.log({ userId: actorId, action: 'BATCH_ADD', entity: 'StockBatch', entityId: batch.id, after: dto });
    return batch;
  }

  async listBatches(companyId: string, productId?: string) {
    return this.prisma.stockBatch.findMany({
      where: { companyId, ...(productId ? { productId } : {}) },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    });
  }

  async expiredOrNear(companyId: string, withinDays = 0) {
    const cutoff = new Date(Date.now() + withinDays * 86400000);
    return this.prisma.stockBatch.findMany({
      where: { companyId, expiryDate: { lte: cutoff }, quantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  // ---------- Phase 2: Valuation (FR2.10) ----------
  async valuation(companyId: string, method: ValuationMethod = ValuationMethod.WEIGHTED_AVG) {
    const products = await this.prisma.product.findMany({ where: { companyId } });
    const result = [];
    for (const p of products) {
      const level = await this.getStockLevel(p.id, undefined);
      const qty = Number(level.quantity);
      let unitCost = Number(p.costPrice);
      if (qty > 0) {
        if (method === ValuationMethod.WEIGHTED_AVG) {
          const batches = await this.prisma.stockBatch.findMany({ where: { productId: p.id, quantity: { gt: 0 } } });
          const totQty = batches.reduce((s, b) => s + Number(b.quantity), 0);
          const totCost = batches.reduce((s, b) => s + Number(b.quantity) * Number(b.costPrice), 0);
          unitCost = totQty > 0 ? totCost / totQty : Number(p.costPrice);
        } else {
          // FIFO: earliest batch cost; LIFO: latest
          const batches = await this.prisma.stockBatch.findMany({
            where: { productId: p.id, quantity: { gt: 0 } },
            orderBy: method === ValuationMethod.FIFO ? { receivedAt: 'asc' } : { receivedAt: 'desc' },
          });
          unitCost = batches.length ? Number(batches[0].costPrice) : Number(p.costPrice);
        }
      }
      result.push({ productId: p.id, sku: p.sku, name: p.name, quantity: qty, unitCost, totalValue: qty * unitCost, method });
    }
    return result;
  }

  // ---------- Phase 2: Stock-take (FR2.9) ----------
  async createStockTake(companyId: string, dto: CreateStockTakeDto, actorId: string, tx: TransactionClient = this.prisma) {
    const ref = `STK-${Date.now()}`;
    const lineData = [];
    for (const l of dto.lines) {
      const level = await this.getStockLevel(l.productId, l.warehouseId, tx);
      lineData.push({ productId: l.productId, warehouseId: l.warehouseId, systemQty: Number(level.quantity), countedQty: l.countedQty });
    }
    const st = await tx.stockTake.create({
      data: { reference: ref, companyId, createdBy: actorId, status: StockTakeStatus.DRAFT, lines: { create: lineData } },
    });
    return st;
  }

  async completeStockTake(companyId: string, id: string, actorId: string, tx: TransactionClient = this.prisma) {
    const st = await tx.stockTake.findFirst({ where: { id, companyId }, include: { lines: true } });
    if (!st) throw new NotFoundException('Stock-take not found');
    for (const line of st.lines) {
      const level = await this.getStockLevel(line.productId, line.warehouseId, tx);
      const diff = Number(line.countedQty) - Number(level.quantity);
      if (diff !== 0) {
        await tx.stockLedger.create({
          data: { productId: line.productId, warehouseId: line.warehouseId, quantity: diff, type: TxType.ADJUST, reference: `STK:${st.reference}` },
        });
      }
    }
    const updated = await tx.stockTake.update({ where: { id }, data: { status: StockTakeStatus.COMPLETED, completedAt: new Date() } });
    await this.maybeAlertLowStock(companyId, tx);
    return updated;
  }

  listStockTakes(companyId: string) {
    return this.prisma.stockTake.findMany({ where: { companyId }, include: { lines: true }, orderBy: { createdAt: 'desc' } });
  }
}
