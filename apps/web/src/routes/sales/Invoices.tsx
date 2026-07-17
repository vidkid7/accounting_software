import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Modal, Field, Select, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

const tone = (s: string) =>
  s === 'CONFIRMED' ? 'success' : s === 'CANCELLED' ? 'danger' : s === 'PAID' ? 'info' : 'neutral';

export default function Invoices() {
  const qc = useQueryClient();
  const { t } = useLang();
  const fmt = useFmt();
  const { data, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: async () => (await api.get('/sales/invoices')).data });
  const customers = useQuery({ queryKey: ['customers'], queryFn: async () => (await api.get('/sales/customers')).data });
  const products = useQuery({ queryKey: ['products'], queryFn: async () => (await api.get('/inventory/products')).data });

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<any[]>([{ productId: '', quantity: 1, rate: 0, taxRate: 13 }]);

  const create = useMutation({
    mutationFn: (body: any) => api.post('/sales/invoices', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setOpen(false); },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/sales/invoices/${id}/cancel`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  function addRow() { setItems([...items, { productId: '', quantity: 1, rate: 0, taxRate: 13 }]); }
  function setRow(i: number, k: string, v: any) {
    setItems(items.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  const subtotal = items.reduce((s, r) => s + Number(r.quantity) * Number(r.rate), 0);
  const tax = items.reduce((s, r) => s + Number(r.quantity) * Number(r.rate) * (Number(r.taxRate) / 100), 0);
  const total = subtotal + tax;

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.invoices')} action={<Button onClick={() => setOpen(true)}>{t('action.add')}</Button>} />
      <Card>
        <Table>
          <thead><tr><Th>Number</Th><Th>{t('field.customer')}</Th><Th>{t('common.status')}</Th><Th className="text-right">{t('common.total')}</Th><Th></Th></tr></thead>
          <tbody>
            {data?.map((inv: any) => (
              <tr key={inv.id}>
                <Td className="tabular">{inv.number}</Td>
                <Td>{inv.customer?.name ?? '-'}</Td>
                <Td><Badge tone={tone(inv.status)}>{inv.status}</Badge></Td>
                <Td className="text-right tabular">{fmt.money(inv.total ?? 0)}</Td>
                <td className="px-4 py-3 border-t border-border">
                  {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (
                    <Button variant="danger" className="h-7 px-2 text-xs" onClick={() => cancel.mutate(inv.id)}>{t('action.cancel')}</Button>
                  )}
                </td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={5}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={t('action.create')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => create.mutate({ customerId, items })} disabled={create.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.customer')}>
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">{t('common.select')}</option>
            {customers.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="space-y-2">
          {items.map((r, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
              <Select value={r.productId} onChange={(e) => setRow(i, 'productId', e.target.value)}>
                <option value="">{t('common.product')}</option>
                {products.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Input type="number" value={r.quantity} onChange={(e) => setRow(i, 'quantity', Number(e.target.value))} />
              <Input type="number" value={r.rate} onChange={(e) => setRow(i, 'rate', Number(e.target.value))} />
              <Input type="number" value={r.taxRate} onChange={(e) => setRow(i, 'taxRate', Number(e.target.value))} />
            </div>
          ))}
          <Button variant="ghost" className="text-xs" onClick={addRow}>+ {t('action.add')}</Button>
        </div>
        <div className="mt-3 text-right text-sm space-y-1">
          <div className="tabular">{t('common.subtotal')}: {fmt.money(subtotal)}</div>
          <div className="tabular">{t('vat')}: {fmt.money(tax)}</div>
          <div className="font-semibold tabular">{t('common.total')}: {fmt.money(total)}</div>
        </div>
      </Modal>
    </div>
  );
}
