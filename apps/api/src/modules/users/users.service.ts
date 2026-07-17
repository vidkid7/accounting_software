import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto/user.dto';
import * as bcrypt from 'bcryptjs';
import { Role, UserStatus } from '@acc/shared-types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(companyId: string, dto: CreateUserDto, actorId: string, tx: TransactionClient = this.prisma) {
    const existing = await tx.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already exists');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await tx.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        role: dto.role,
        status: UserStatus.ACTIVE,
        companyId,
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      after: user,
    });
    return user;
  }

  async findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    });
  }

  async findOne(companyId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateRole(companyId: string, id: string, dto: UpdateUserRoleDto, actorId: string, tx: TransactionClient = this.prisma) {
    await this.findOne(companyId, id);
    const updated = await tx.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, role: true },
    });
    await this.audit.log({ userId: actorId, action: 'UPDATE', entity: 'User', entityId: id, after: updated });
    return updated;
  }

  async updateStatus(companyId: string, id: string, dto: UpdateUserStatusDto, actorId: string, tx: TransactionClient = this.prisma) {
    await this.findOne(companyId, id);
    const updated = await tx.user.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, status: true },
    });
    await this.audit.log({ userId: actorId, action: 'UPDATE', entity: 'User', entityId: id, after: updated });
    return updated;
  }
}
