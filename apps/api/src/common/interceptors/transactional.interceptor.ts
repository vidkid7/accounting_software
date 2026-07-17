import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Wraps every request in a DB transaction. If the handler throws, the
 * transaction is rolled back — guaranteeing atomic stock + ledger updates.
 */
@Injectable()
export class TransactionalInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransactionalInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only wrap HTTP requests (not internal calls / cron)
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();

    return new Observable((subscriber) => {
      this.prisma
        .$transaction(async (tx) => {
          // Expose the transaction client to controllers/services via @Tx()
          req.prismaTx = tx;

          const sub = next.handle().subscribe({
            next: (val) => subscriber.next(val),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });

          // Keep the transaction open until the response stream completes.
          await new Promise<void>((resolve, reject) => {
            sub.add(() => resolve());
            sub.add(() => reject(subscriber.error));
          });
        })
        .catch((err) => {
          this.logger.error('Transaction rolled back', err?.message);
          subscriber.error(err);
        });
    });
  }
}
