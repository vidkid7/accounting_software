import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface CreateBranchDto {
  code: string;
  name: string;
  address?: string;
  isDefault?: boolean;
}

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(companyId: string, dto: CreateBranchDto, actorId: string, tx: TransactionClient = this.prisma) {
    if (dto.isDefault) {
      await tx.branch.updateMany({ where: { companyId, isDefault: true }, data: { isDefault: false } });
    }
    const branch = await tx.branch.create({ data: { ...dto, companyId } });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'Branch', entityId: branch.id, after: dto });
    return branch;
  }

  async list(companyId: string) {
    return this.prisma.branch.findMany({ where: { companyId }, orderBy: { code: 'asc' } });
  }
}
