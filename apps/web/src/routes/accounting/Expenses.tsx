import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Modal, Field, Select, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

const empty = { category: 'Rent', description: '', amount: 0, paymentMode: 'CASH' };

export default function Expenses() {
  const qc = useQueryClient();
  const { t } = useLang();
  const fmt = useFmt();
  const { data, isLoading } = useQuery({ queryKey: ['expenses'], queryFn: async () => (await api.get('/accounting/expense')).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const create = useMutation({
    mutationFn: (body: any) => api.post('/accounting/expense', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setOpen(false); },
  });
  if (isLoading) return <p>{t('common.loading')}</p>;
  const total = (data ?? []).reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);

  return (
    <div>
      <PageHeader title={t('nav.expenses')} action={<Button onClick={() => setOpen(true)}>{t('action.add')}</Button>} />
      <Card>
        <Table>
          <thead><tr><Th>{t('field.category')}</Th><Th>{t('field.description')}</Th><Th>{t('field.paymentMode')}</Th><Th className="text-right">{t('field.amount')}</Th></tr></thead>
          <tbody>
            {data?.map((e: any) => (
              <tr key={e.id}><Td><Badge tone="warning">{e.category}</Badge></Td><Td>{e.description}</Td><Td>{e.paymentMode}</Td><Td className="text-right tabular">{fmt.money(e.amount)}</Td></tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={4}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
      <p className="mt-3 text-right font-semibold tabular">{t('common.total')}: {fmt.money(total)}</p>
      <Modal open={open} onClose={() => setOpen(false)} title={t('action.add')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => create.mutate(form)} disabled={create.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.category')}><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
        <Field label={t('field.description')}><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label={t('field.amount')}><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
        <Field label={t('field.paymentMode')}>
          <Select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
            {['CASH', 'BANK', 'CARD', 'MOBILE'].map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
