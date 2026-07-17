import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Input, Badge } from '../../components/ui';
import { PageHeader, Modal, Field, Select, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

export default function Bank() {
  const qc = useQueryClient();
  const { t } = useLang();
  const fmt = useFmt();
  const accounts = useQuery({ queryKey: ['bank-accounts'], queryFn: async () => (await api.get('/accounting/bank/accounts')).data });
  const txns = useQuery({ queryKey: ['bank-txns'], queryFn: async () => (await api.get('/accounting/bank/transactions')).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: '', accountNo: '', bankName: '', currency: 'NPR' });

  const addAccount = useMutation({
    mutationFn: (body: any) => api.post('/accounting/bank/accounts', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts'] }); setOpen(false); },
  });
  const deposit = useMutation({
    mutationFn: (body: any) => api.post('/accounting/bank/deposit', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-txns'] }),
  });
  const withdraw = useMutation({
    mutationFn: (body: any) => api.post('/accounting/bank/withdraw', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-txns'] }),
  });

  function quick(type: 'deposit' | 'withdraw') {
    const bankAccountId = accounts.data?.[0]?.id;
    if (!bankAccountId) return;
    const amt = prompt(`${type} amount?`);
    if (amt) (type === 'deposit' ? deposit : withdraw).mutate({ bankAccountId, amount: Number(amt), description: type });
  }

  return (
    <div>
      <PageHeader title={t('nav.bank')} action={<Button onClick={() => setOpen(true)}>{t('action.add')}</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Card>
          <p className="text-sm font-medium text-foreground-muted mb-3">Accounts</p>
          <Table>
            <thead><tr><Th>{t('field.name')}</Th><Th>{t('field.currency')}</Th><Th>{t('common.actions')}</Th></tr></thead>
            <tbody>
              {accounts.data?.map((a: any) => (
                <tr key={a.id}><Td>{a.name}</Td><Td>{a.currency}</Td>
                  <td className="px-4 py-3 border-t border-border space-x-2">
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => quick('deposit')}>Deposit</Button>
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => quick('withdraw')}>Withdraw</Button>
                  </td></tr>
              ))}
              {accounts.data?.length === 0 && <tr><td colSpan={3}><Empty>{t('common.none')}</Empty></td></tr>}
            </tbody>
          </Table>
        </Card>
        <Card>
          <p className="text-sm font-medium text-foreground-muted mb-3">Transactions</p>
          <Table>
            <thead><tr><Th>{t('field.description')}</Th><Th>{t('common.status')}</Th><Th className="text-right">{t('field.amount')}</Th></tr></thead>
            <tbody>
              {txns.data?.map((x: any) => (
                <tr key={x.id}>
                  <Td>{x.description}</Td>
                  <Td><Badge tone={x.reconciled ? 'success' : 'warning'}>{x.reconciled ? 'Reconciled' : 'Open'}</Badge></Td>
                  <Td className="text-right tabular">{fmt.money(x.amount)}</Td>
                </tr>
              ))}
              {txns.data?.length === 0 && <tr><td colSpan={3}><Empty>{t('common.none')}</Empty></td></tr>}
            </tbody>
          </Table>
        </Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={t('action.add')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('action.cancel')}</Button><Button onClick={() => addAccount.mutate(form)} disabled={addAccount.isPending}>{t('action.save')}</Button></>}>
        <Field label={t('field.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t('field.code')}><Input value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} /></Field>
        <Field label="Bank"><Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></Field>
        <Field label={t('field.currency')}>
          <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            <option>NPR</option><option>USD</option><option>INR</option>
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
