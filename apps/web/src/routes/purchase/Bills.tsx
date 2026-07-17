import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Modal, Field, Select, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

export default function Bills() {
  const qc = useQueryClient();
  const { t } = useLang();
  const fmt = useFmt();
  const { data, isLoading } = useQuery({ queryKey: ['bills'], queryFn: async () => (await api.get('/purchase/bills')).data });
  const products = useQuery({ queryKey: ['products'], queryFn: async () => (await api.get('/inventory/products')).data });
  const vendors = useQuery({ queryKey: ['vendors'], queryFn: async () => (await api.get('/purchase/vendors')).data });

  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [items, setItems] = useState<any[]>([{ productId: '', quantity: 1, rate: 0 }]);

  const create = useMutation({
    mutationFn: (body: any) => api.post('/purchase/bills', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); setOpen(false); },
  });

  function addRow() { setItems([...items, { productId: '', quantity: 1, rate: 0 }]); }
  function setRow(i: number, k: string, v: any) {
    setItems(items.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  const total = items.reduce((s, r) => s + (Number(r.quantity) * Number(r.rate)), 0);

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.bills')} action={<Button onClick={() => setOpen(true)}>{t('action.add')}</Button>} />
      <Card>
        <Table>
          <thead><tr><Th>#</Th><Th>{t('field.vendor')}</Th><Th className="text-right">{t('common.total')}</Th><Th>{t('common.status')}</Th></tr></thead>
          <tbody>
            {data?.map((b: any, i: number) => (
              <tr key={b.id}>
                <Td className="tabular">#{i + 1}</Td>
                <Td>{b.vendor?.name ?? '—'}</Td>
                <Td className="text-right tabular">{fmt.money(b.total ?? 0)}</Td>
                <Td><Badge tone="neutral">{b.status}</Badge></Td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={4}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={t('action.create')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => create.mutate({ vendorId, items })} disabled={create.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.vendor')}>
          <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">{t('common.select')}</option>
            {vendors.data?.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </Field>
        <div className="space-y-2">
          {items.map((r, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <Select value={r.productId} onChange={(e) => setRow(i, 'productId', e.target.value)}>
                <option value="">{t('common.product')}</option>
                {products.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Input type="number" placeholder={t('field.quantity') ?? 'Qty'} value={r.quantity} onChange={(e) => setRow(i, 'quantity', Number(e.target.value))} />
              <Input type="number" placeholder={t('field.rate') ?? 'Rate'} value={r.rate} onChange={(e) => setRow(i, 'rate', Number(e.target.value))} />
            </div>
          ))}
          <Button variant="ghost" className="text-xs" onClick={addRow}>+ {t('action.add')}</Button>
        </div>
        <p className="mt-3 text-right font-semibold tabular">{t('common.total')}: {fmt.money(total)}</p>
      </Modal>
    </div>
  );
}
