import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Modal, Field, Select, Empty } from '../../components/crud';
import { useState } from 'react';
import { useLang } from '../../store/lang';

const empty = { code: '', name: '', type: 'ASSET' };

export default function Accounts() {
  const qc = useQueryClient();
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await api.get('/accounting/accounts')).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const create = useMutation({
    mutationFn: (body: any) => api.post('/accounting/accounts', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setOpen(false); },
  });
  const seed = useMutation({ mutationFn: () => api.post('/accounting/accounts/seed', {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }) });
  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.accounts')}
        action={<><Button variant="secondary" className="mr-2" onClick={() => seed.mutate()} disabled={seed.isPending}>Seed Default</Button><Button onClick={() => setOpen(true)}>{t('action.add')}</Button></>} />
      <Card>
        <Table>
          <thead><tr><Th>{t('field.code')}</Th><Th>{t('field.name')}</Th><Th>Type</Th></tr></thead>
          <tbody>
            {data?.map((a: any) => (
              <tr key={a.id}><Td className="tabular">{a.code}</Td><Td>{a.name}</Td><Td><Badge tone="info">{a.type}</Badge></Td></tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={3}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={t('action.add')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => create.mutate(form)} disabled={create.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.code')}><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
        <Field label={t('field.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Type">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
