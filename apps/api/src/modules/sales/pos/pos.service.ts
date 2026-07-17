import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SalesService } from '../sales.service';
import { PaymentService } from '../../accounting/payment/payment.service';
import { CreateInvoiceDto, InvoiceLineItemInput } from '../dto/sales.dto';
import { PaymentMode, PaymentProvider } from '@acc/shared-types';

export interface PosSaleDto {
  items: InvoiceLineItemInput[];
  customerId?: string; // walk-in customers may be omitted
  warehouseId?: string;
  branchId?: string;
  payment: {
    amount: number;
    currency?: string;
    paymentMode: PaymentMode;
    provider?: PaymentProvider;
  };
  dueDate?: string;
}

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sales: SalesService,
    private readonly payments: PaymentService,
  ) {}

  /**
   * POS sale: reuses the SAME atomic flow as web invoices (stock-out + journal),
   * then records the payment in the same request transaction. Walk-in sales use a
   * synthetic "Walk-in Customer" if no customerId is supplied.
   */
  async checkout(companyId: string, dto: PosSaleDto, actorId: string, tx: TransactionClient = this.prisma) {
    let customerId = dto.customerId;
    if (!customerId) {
      const walkIn = await tx.customer.findFirst({ where: { companyId, name: 'Walk-in Customer' } });
      customerId = walkIn
        ? walkIn.id
        : (await tx.customer.create({ data: { name: 'Walk-in Customer', companyId } })).id;
    }

    const invoiceDto: CreateInvoiceDto = { customerId, items: dto.items, dueDate: dto.dueDate };
    const invoice = await this.sales.createInvoice(companyId, invoiceDto, actorId, tx);

    // Record payment in base or given currency
    const payment = await this.payments.create(
      companyId,
      {
        customerId,
        invoiceId: invoice.id,
        amount: dto.payment.amount,
        currency: dto.payment.currency,
        paymentMode: dto.payment.paymentMode,
        provider: dto.payment.provider ?? PaymentProvider.MANUAL,
        branchId: dto.branchId,
      },
      actorId,
      tx,
    );

    await this.audit.log({ userId: actorId, action: 'POS_SALE', entity: 'Invoice', entityId: invoice.id, after: { walkIn: !dto.customerId } });
    return { invoice, payment };
  }

  async list(companyId: string) {
    return this.prisma.invoice.findMany({
      where: { companyId },
      include: { lineItems: true, payments: true },
      orderBy: { issuedAt: 'desc' },
    });
  }
}
