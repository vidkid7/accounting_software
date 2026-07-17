import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input } from '../../components/ui';
import { PageHeader, Modal, Field, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';

interface Customer { id: string; name: string; email?: string; phone?: string; taxId?: string; }
const empty = { name: '', email: '', phone: '', taxId: '' };

export default function Customers() {
  const qc = useQueryClient();
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: async () => (await api.get('/sales/customers')).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const save = useMutation({
    mutationFn: (body: any) => api.post('/sales/customers', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setOpen(false); },
  });

  function openForm() { setForm(empty); setOpen(true); }
  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.customers')} action={<Button onClick={() => openForm()}>{t('action.add')}</Button>} />
      <Card>
        <Table>
          <thead><tr><Th>{t('field.name')}</Th><Th>{t('field.email')}</Th><Th>{t('field.phone')}</Th><Th>{t('field.pan')}</Th><Th>{t('common.actions')}</Th></tr></thead>
          <tbody>
            {data?.map((c: Customer) => (
              <tr key={c.id}>
                <Td>{c.name}</Td>
                <Td>{c.email ?? '—'}</Td>
                <Td>{c.phone ?? '—'}</Td>
                <Td>{c.taxId ?? '—'}</Td>
                <td className="px-4 py-3 border-t border-border">
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openForm()}>{t('action.edit')}</Button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={5}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={t('action.add')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t('field.email')}><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label={t('field.phone')}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="PAN"><Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></Field>
      </Modal>
    </div>
  );
}
