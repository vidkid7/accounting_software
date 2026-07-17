import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface UpdateCompanyDto {
  name?: string;
  address?: string;
  taxId?: string;
  baseCurrency?: string;
  logoUrl?: string;
}

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getProfile(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(companyId: string, dto: UpdateCompanyDto, actorId: string, tx: TransactionClient = this.prisma) {
    const updated = await tx.company.update({ where: { id: companyId }, data: dto });
    await this.audit.log({ userId: actorId, action: 'UPDATE', entity: 'Company', entityId: companyId, after: dto });
    return updated;
  }
}
