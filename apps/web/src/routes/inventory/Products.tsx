import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Modal, ConfirmDialog, Field, Select, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  taxCode: string;
  reorderLevel: number;
  costPrice: number;
  salePrice: number;
}

const empty = { sku: '', name: '', category: 'General', unit: 'pcs', taxCode: 'VAT', costPrice: 0, salePrice: 0, reorderLevel: 0 };

export default function Products() {
  const qc = useQueryClient();
  const { t } = useLang();
  const fmt = useFmt();
  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: async () => (await api.get('/inventory/products')).data });

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(empty);

  const save = useMutation({
    mutationFn: (body: any) => {
      const dto = {
        sku: body.sku,
        name: body.name,
        category: body.category,
        unit: body.unit,
        taxCode: body.taxCode,
        reorderLevel: Number(body.reorderLevel) || 0,
        costPrice: Number(body.costPrice) || 0,
        salePrice: Number(body.salePrice) || 0,
      };
      void (body.id ?? body.companyId ?? body.createdAt); // ignore server-managed fields copied into form on edit
      return (editing ? api.put(`/inventory/products/${editing.id}`, dto) : api.post('/inventory/products', dto));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setDel(null);
    },
  });

  function openForm(p?: Product) {
    setEditing(p ?? null);
    setForm(p ?? empty);
    setOpen(true);
  }

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.products')} action={<Button onClick={() => openForm()}>{t('action.add')}</Button>} />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t('field.sku')}</Th>
              <Th>{t('field.name')}</Th>
              <Th>{t('field.category')}</Th>
              <Th>{t('field.unit')}</Th>
              <Th>{t('field.taxCode')}</Th>
              <Th className="text-right">{t('field.costPrice')}</Th>
              <Th className="text-right">{t('field.salePrice')}</Th>
              <Th>{t('common.actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p: Product) => (
              <tr key={p.id}>
                <Td>{p.sku}</Td>
                <Td>{p.name}</Td>
                <Td>{p.category}</Td>
                <Td>{p.unit}</Td>
                <Td><Badge tone="info">{p.taxCode}</Badge></Td>
                <Td className="text-right tabular">{fmt.money(p.costPrice)}</Td>
                <Td className="text-right tabular">{fmt.money(p.salePrice)}</Td>
                <td className="px-4 py-3 border-t border-border space-x-2">
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openForm(p)}>{t('action.edit')}</Button>
                  <Button variant="danger" className="h-7 px-2 text-xs" onClick={() => setDel(p)}>{t('action.delete')}</Button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr><td colSpan={8}><Empty>{t('common.none')}</Empty></td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('action.edit') : t('action.add')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{t('action.save')}</Button>
          </>
        }
      >
        <Field label={t('field.sku')}><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
        <Field label={t('field.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('field.category')}><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label={t('field.unit')}><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
          <Field label={t('field.taxCode')}>
            <Select value={form.taxCode} onChange={(e) => setForm({ ...form, taxCode: e.target.value })}>
              <option value="VAT">VAT (13%)</option>
              <option value="VAT0">VAT 0%</option>
              <option value="EXEMPT">Exempt</option>
            </Select>
          </Field>
          <Field label={t('field.reorderLevel')}>
            <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
          </Field>
          <Field label={t('field.costPrice')}>
            <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
          </Field>
          <Field label={t('field.salePrice')}>
            <Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        message={t('common.confirmDelete')}
        onCancel={() => setDel(null)}
        onConfirm={() => del && remove.mutate(del.id)}
        confirmText={t('action.delete')}
      />
    </div>
  );
}
