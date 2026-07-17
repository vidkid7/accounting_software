import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Field, Select, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';

export default function Integrations() {
  const qc = useQueryClient();
  const { t } = useLang();
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: async () => (await api.get('/sales/invoices')).data });
  const feed = useQuery({ queryKey: ['bank-feed'], queryFn: async () => (await api.get('/integrations/bank-feed')).data });

  const charge = useMutation({
    mutationFn: (body: any) => api.post('/integrations/payment-gateway/charge', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/integrations/e-invoice/${id}/submit`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
  const imp = useMutation({
    mutationFn: (rows: any[]) => api.post('/integrations/bank-feed/import', { bankAccountId: '', rows }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-feed'] }),
  });

  const [amount, setAmount] = useState(100);
  const [provider, setProvider] = useState('STRIPE');

  return (
    <div>
      <PageHeader title={t('nav.integrations')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <p className="font-medium mb-3">{t('integration.paymentGateway')}</p>
          <Field label={`${t('field.amount')} (NPR)`}><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          <Field label="Provider">
            <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
              {['STRIPE', 'RAZORPAY', 'PAYPAL'].map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
          </Field>
          <Button onClick={() => charge.mutate({ amount, currency: 'NPR', provider })} disabled={charge.isPending}>Charge (test)</Button>
          {charge.data?.data && <p className="mt-2 text-xs text-foreground-muted">Status: {charge.data.data.status} | Ref: {charge.data.data.providerRef}</p>}
        </Card>
        <Card>
          <p className="font-medium mb-3">{t('integration.ird')}</p>
          <Table>
            <thead><tr><Th>{t('field.number')}</Th><Th>{t('common.status')}</Th><Th></Th></tr></thead>
            <tbody>
              {invoices.data?.map((inv: any) => (
                <tr key={inv.id}><Td className="tabular">{inv.number}</Td><Td><Badge tone={inv.eInvoiceStatus === 'ACKNOWLEDGED' ? 'success' : 'neutral'}>{inv.eInvoiceStatus ?? 'NOT_SUBMITTED'}</Badge></Td>
                  <td className="px-4 py-3 border-t border-border"><Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => submit.mutate(inv.id)}>{t('action.submit')}</Button></td></tr>
              ))}
              {invoices.data?.length === 0 && <tr><td colSpan={3}><Empty>{t('common.none')}</Empty></td></tr>}
            </tbody>
          </Table>
        </Card>
        <Card>
          <p className="font-medium mb-3">{t('integration.bankFeed')}</p>
          <Button onClick={() => imp.mutate([{ date: new Date().toISOString(), description: 'Bank txn', amount: 500 }])} disabled={imp.isPending}>Import sample</Button>
          <Table className="mt-3">
            <thead><tr><Th>{t('field.description')}</Th><Th className="text-right">{t('field.amount')}</Th></tr></thead>
            <tbody>
              {feed.data?.map((f: any) => <tr key={f.id}><Td>{f.description}</Td><Td className="text-right tabular">{f.amount}</Td></tr>)}
              {feed.data?.length === 0 && <tr><td colSpan={2}><Empty>{t('common.none')}</Empty></td></tr>}
            </tbody>
          </Table>
        </Card>
        <Card>
          <p className="font-medium mb-3">{t('integration.export')}</p>
          <a href="/api/integrations/export/ledger.csv" className="text-brand hover:underline text-sm">Download ledger CSV (Tally / QuickBooks)</a>
        </Card>
      </div>
    </div>
  );
}
