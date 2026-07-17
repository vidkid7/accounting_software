import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Modal, Field, Select, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';

const empty = { currency: 'USD', rate: 1, effectiveDate: new Date().toISOString().slice(0, 10) };

export default function Fx() {
  const qc = useQueryClient();
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['fx-rates'], queryFn: async () => (await api.get('/accounting/fx/rates')).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const create = useMutation({
    mutationFn: (body: any) => api.post('/accounting/fx/rates', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fx-rates'] }); setOpen(false); },
  });
  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.fx')} action={<Button onClick={() => setOpen(true)}>{t('action.add')}</Button>} />
      <Card>
        <Table>
          <thead><tr><Th>{t('field.currency')}</Th><Th className="text-right">{t('field.rate')}</Th><Th>{t('field.date')}</Th></tr></thead>
          <tbody>
            {data?.map((r: any) => (
              <tr key={r.id}><Td><Badge tone="info">{r.currency}</Badge></Td><Td className="text-right tabular">{r.rate}</Td><Td className="tabular">{r.effectiveDate?.slice(0, 10)}</Td></tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={3}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={t('action.add')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => create.mutate(form)} disabled={create.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.currency')}>
          <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {['USD', 'EUR', 'INR', 'GBP', 'CNY'].map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label={t('field.rate')}><Input type="number" step="0.0001" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></Field>
        <Field label={t('field.date')}><Input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} /></Field>
      </Modal>
    </div>
  );
}
