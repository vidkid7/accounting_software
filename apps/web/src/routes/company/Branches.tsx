import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Modal, Field, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';

const empty = { code: '', name: '', address: '', isDefault: false };

export default function Branches() {
  const qc = useQueryClient();
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get('/company/branches')).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const create = useMutation({
    mutationFn: (body: any) => api.post('/company/branches', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); setOpen(false); },
  });
  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.branches')} action={<Button onClick={() => setOpen(true)}>{t('action.add')}</Button>} />
      <Card>
        <Table>
          <thead><tr><Th>{t('field.code')}</Th><Th>{t('field.name')}</Th><Th>{t('field.location')}</Th><Th>Default</Th></tr></thead>
          <tbody>
            {data?.map((b: any) => (
              <tr key={b.id}><Td className="tabular">{b.code}</Td><Td>{b.name}</Td><Td>{b.address ?? '—'}</Td><Td>{b.isDefault && <Badge tone="success">Default</Badge>}</Td></tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={4}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={t('action.add')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => create.mutate(form)} disabled={create.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.code')}><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
        <Field label={t('field.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t('field.location')}><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      </Modal>
    </div>
  );
}
