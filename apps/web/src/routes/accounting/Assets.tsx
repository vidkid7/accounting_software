import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Modal, Field, Select, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

const empty = { code: '', name: '', category: 'Equipment', purchaseDate: new Date().toISOString().slice(0, 10), purchaseCost: 0, salvageValue: 0, usefulLife: 60, method: 'STRAIGHT_LINE' };

export default function Assets() {
  const qc = useQueryClient();
  const { t } = useLang();
  const fmt = useFmt();
  const { data, isLoading } = useQuery({ queryKey: ['assets'], queryFn: async () => (await api.get('/accounting/assets')).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const create = useMutation({
    mutationFn: (body: any) => api.post('/accounting/assets', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); setOpen(false); },
  });
  const dep = useMutation({
    mutationFn: () => api.post('/accounting/assets/depreciate', { from: new Date(new Date().getFullYear(), 0, 1).toISOString(), to: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.assets')}
        action={<><Button variant="secondary" className="mr-2" onClick={() => dep.mutate()} disabled={dep.isPending}>{t('action.deprecate')}</Button><Button onClick={() => setOpen(true)}>{t('action.add')}</Button></>} />
      <Card>
        <Table>
          <thead><tr><Th>{t('field.code')}</Th><Th>{t('field.name')}</Th><Th>{t('field.category')}</Th><Th className="text-right">Cost</Th><Th className="text-right">Acc. Dep.</Th><Th>{t('common.status')}</Th></tr></thead>
          <tbody>
            {data?.map((a: any) => (
              <tr key={a.id}>
                <Td className="tabular">{a.code}</Td><Td>{a.name}</Td><Td>{a.category}</Td>
                <Td className="text-right tabular">{fmt.money(a.purchaseCost)}</Td>
                <Td className="text-right tabular">{fmt.money(a.accumulatedDepreciation ?? 0)}</Td>
                <Td><Badge tone={a.status === 'ACTIVE' ? 'success' : 'neutral'}>{a.status}</Badge></Td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={6}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={t('action.add')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => create.mutate(form)} disabled={create.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.code')}><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
        <Field label={t('field.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t('field.category')}><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
        <Field label={t('field.date')}><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('field.costPrice')}><Input type="number" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: Number(e.target.value) })} /></Field>
          <Field label="Salvage"><Input type="number" value={form.salvageValue} onChange={(e) => setForm({ ...form, salvageValue: Number(e.target.value) })} /></Field>
          <Field label="Life (months)"><Input type="number" value={form.usefulLife} onChange={(e) => setForm({ ...form, usefulLife: Number(e.target.value) })} /></Field>
          <Field label="Method">
            <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="STRAIGHT_LINE">Straight Line</option>
              <option value="REDUCING_BALANCE">Reducing Balance</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
