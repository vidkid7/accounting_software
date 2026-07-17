import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AuditMeta {
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(meta: AuditMeta) {
    await this.prisma.auditLog.create({
      data: {
        userId: meta.userId,
        action: meta.action,
        entity: meta.entity,
        entityId: meta.entityId,
        before: meta.before as object | undefined,
        after: meta.after as object | undefined,
      },
    });
  }
}
