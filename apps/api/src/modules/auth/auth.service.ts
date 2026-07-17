import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { Role, UserStatus } from '@acc/shared-types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: {
    email: string;
    password: string;
    name: string;
    companyName: string;
    companyAddress: string;
    companyTaxId: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          address: dto.companyAddress,
          taxId: dto.companyTaxId,
          fiscalYearStart: new Date(new Date().getFullYear(), 3, 1),
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashed,
          name: dto.name,
          role: Role.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          companyId: company.id,
        },
      });

      await this.audit.log({
        userId: user.id,
        action: 'CREATE',
        entity: 'Company',
        entityId: company.id,
        after: { name: company.name },
      });

      return this.buildTokens(user);
    });
  }

  async login(email: string, password: string, twoFactorToken?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        throw new BadRequestException('2FA token required');
      }
      const ok = otplib.authenticator.verify({
        token: twoFactorToken,
        secret: user.twoFactorSecret || '',
      });
      if (!ok) {
        throw new UnauthorizedException('Invalid 2FA token');
      }
    }

    return this.buildTokens(user);
  }

  async enableTwoFactor(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (!user.twoFactorSecret) {
      user.twoFactorSecret = otplib.authenticator.generateSecret();
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: user.twoFactorSecret },
      });
    }

    const ok = otplib.authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });
    if (!ok) throw new BadRequestException('Invalid token');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { enabled: true };
  }

  async getTwoFactorQr(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const secret = user.twoFactorSecret || otplib.authenticator.generateSecret();
    if (!user.twoFactorSecret) {
      await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
    }

    const otpauth = otplib.authenticator.keyuri(user.email, 'AccountingSystem', secret);
    const qr = await QRCode.toDataURL(otpauth);
    return { qr, secret };
  }

  private buildTokens(user: { id: string; email: string; role: string; companyId: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m',
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });
    return { accessToken, refreshToken };
  }

  /** Returns the current user's profile for the frontend auth store. */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
    };
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwt.verify(token, { secret: this.config.get('JWT_ACCESS_SECRET') });
  }
}
