import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input } from '../../components/ui';
import { PageHeader, Modal, ConfirmDialog, Field, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';

interface Warehouse { id: string; name: string; location?: string; }
const empty = { name: '', location: '' };

export default function Warehouses() {
  const qc = useQueryClient();
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await api.get('/inventory/warehouses')).data });
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<any>(empty);

  const save = useMutation({
    mutationFn: (body: any) => (editing ? api.put(`/inventory/warehouses/${editing.id}`, body) : api.post('/inventory/warehouses', body)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setOpen(false); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/warehouses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setDel(null); },
  });

  function openForm(w?: Warehouse) { setEditing(w ?? null); setForm(w ?? empty); setOpen(true); }
  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.warehouses')} action={<Button onClick={() => openForm()}>{t('action.add')}</Button>} />
      <Card>
        <Table>
          <thead><tr><Th>{t('field.name')}</Th><Th>{t('field.location')}</Th><Th>{t('common.actions')}</Th></tr></thead>
          <tbody>
            {data?.map((w: Warehouse) => (
              <tr key={w.id}>
                <Td>{w.name}</Td>
                <Td>{w.location ?? <span className="text-foreground-muted">—</span>}</Td>
                <td className="px-4 py-3 border-t border-border space-x-2">
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openForm(w)}>{t('action.edit')}</Button>
                  <Button variant="danger" className="h-7 px-2 text-xs" onClick={() => setDel(w)}>{t('action.delete')}</Button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={3}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('action.edit') : t('action.add')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t('field.location')}><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
      </Modal>
      <ConfirmDialog open={!!del} message={t('common.confirmDelete')} onCancel={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} confirmText={t('action.delete')} />
    </div>
  );
}
