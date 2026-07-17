import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TransactionClient, PrismaService } from '../prisma/prisma.service';

/**
 * Returns the transactional Prisma client for the current request so that
 * service methods participate in the single atomic transaction opened by
 * TransactionalInterceptor. Falls back to the default client outside a request
 * (e.g. internal calls / scripts).
 */
export const Tx = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TransactionClient => {
    const request = ctx.switchToHttp().getRequest();
    return (request?.prismaTx as TransactionClient) ?? (request?.app?.get?.(PrismaService) as TransactionClient);
  },
);
