import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AccountingService } from '../accounting.service';
import { DepreciationMethod, AssetStatus } from '@acc/shared-types';

export interface CreateAssetDto {
  code: string;
  name: string;
  category?: string;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue?: number;
  usefulLife: number; // months
  method?: DepreciationMethod;
  branchId?: string;
  glAssetAccountId?: string;
  glDepreciationAccountId?: string;
  glExpenseAccountId?: string;
}

export interface DepreciationRunResult {
  assetId: string;
  code: string;
  name: string;
  periodStart: Date;
  periodEnd: Date;
  amount: number;
  accumulated: number;
  journalEntryId?: string;
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accounting: AccountingService,
  ) {}

  async create(companyId: string, dto: CreateAssetDto, actorId: string, tx: TransactionClient = this.prisma) {
    const asset = await tx.fixedAsset.create({
      data: {
        companyId,
        code: dto.code,
        name: dto.name,
        category: dto.category,
        purchaseDate: new Date(dto.purchaseDate),
        purchaseCost: dto.purchaseCost,
        salvageValue: dto.salvageValue ?? 0,
        usefulLife: dto.usefulLife,
        method: dto.method ?? DepreciationMethod.STRAIGHT_LINE,
        branchId: dto.branchId,
        glAssetAccountId: dto.glAssetAccountId,
        glDepreciationAccountId: dto.glDepreciationAccountId,
        glExpenseAccountId: dto.glExpenseAccountId,
      },
    });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'FixedAsset', entityId: asset.id, after: dto });
    return asset;
  }

  async list(companyId: string) {
    return this.prisma.fixedAsset.findMany({ where: { companyId }, orderBy: { code: 'asc' } });
  }

  /** Straight-line or reducing-balance depreciation for one period (monthly). */
  private periodDepreciation(asset: {
    method: DepreciationMethod | string;
    purchaseCost: number;
    salvageValue: number;
    usefulLife: number;
    accumulatedDepreciation: number;
  }, months: number): number {
    const cost = Number(asset.purchaseCost);
    const salvage = Number(asset.salvageValue);
    const life = asset.usefulLife;
    if (life <= 0) return 0;

    if (asset.method === DepreciationMethod.REDUCING_BALANCE) {
      // Common 2x declining balance, prorated for the period (months/12).
      const rate = 2 / life;
      const bookValue = cost - Number(asset.accumulatedDepreciation);
      let dep = bookValue * rate * (months / 12);
      const maxDep = bookValue - salvage;
      dep = Math.min(dep, Math.max(maxDep, 0));
      return dep;
    }

    // Straight-line: (cost - salvage) spread evenly over `life` months.
    const monthly = (cost - salvage) / life;
    return monthly * months;
  }

  /**
   * Runs depreciation for the period [from, to]. Posts a journal entry:
   *   Depreciation Expense Dr / Accumulated Depreciation Cr
   * Atomic within the request transaction.
   */
  async runDepreciation(companyId: string, from: Date, to: Date, actorId: string, tx: TransactionClient = this.prisma): Promise<DepreciationRunResult[]> {
    const months = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    const assets = await tx.fixedAsset.findMany({ where: { companyId, status: AssetStatus.ACTIVE } });
    const accounts = await tx.account.findMany({ where: { companyId } });
    const expenseAcct = accounts.find((a) => a.code === '5100'); // Operating Expenses
    const accumAcct = accounts.find((a) => a.code === '1400'); // Accumulated Depreciation (contra-asset)

    const results: DepreciationRunResult[] = [];

    for (const asset of assets) {
      const dep = this.periodDepreciation(
        {
          method: asset.method,
          purchaseCost: Number(asset.purchaseCost),
          salvageValue: Number(asset.salvageValue),
          usefulLife: asset.usefulLife,
          accumulatedDepreciation: Number(asset.accumulatedDepreciation),
        },
        months,
      );
      if (dep <= 0) continue;

      const accumulated = Number(asset.accumulatedDepreciation) + dep;
      const newStatus = accumulated >= Number(asset.purchaseCost) - Number(asset.salvageValue)
        ? AssetStatus.FULLY_DEPRECIATED
        : AssetStatus.ACTIVE;

      const updated = await tx.fixedAsset.update({
        where: { id: asset.id },
        data: { accumulatedDepreciation: accumulated, lastDepreciationDate: to, status: newStatus },
      });

      // Post journal (only if accounts exist; otherwise just record the entry)
      let journalEntryId: string | undefined;
      if (expenseAcct && accumAcct) {
        const je = await this.accounting.createJournal(
          companyId,
          {
            reference: `DEP:${asset.code}`,
            description: `Depreciation ${asset.name} (${from.toISOString().slice(0, 10)}..${to.toISOString().slice(0, 10)})`,
            lines: [
              { accountId: expenseAcct.id, debit: dep },
              { accountId: accumAcct.id, credit: dep },
            ],
          },
          actorId,
          tx,
        );
        journalEntryId = je.id;
      }

      const entry = await tx.depreciationEntry.create({
        data: {
          companyId,
          fixedAssetId: asset.id,
          periodStart: from,
          periodEnd: to,
          amount: dep,
          accumulated,
          journalEntryId,
        },
      });

      results.push({
        assetId: asset.id,
        code: asset.code,
        name: asset.name,
        periodStart: from,
        periodEnd: to,
        amount: dep,
        accumulated,
        journalEntryId,
      });
    }

    await this.audit.log({ userId: actorId, action: 'DEPRECIATE', entity: 'FixedAsset', entityId: companyId, after: { from, to, count: results.length } });
    return results;
  }
}
