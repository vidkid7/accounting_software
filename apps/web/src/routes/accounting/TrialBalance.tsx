import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, Table, Th, Td, Badge } from '../../components/ui';
import { PageHeader } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

export default function TrialBalance() {
  const { t } = useLang();
  const fmt = useFmt();
  const { data, isLoading } = useQuery({ queryKey: ['trial-balance'], queryFn: async () => (await api.get('/accounting/trial-balance')).data });
  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <PageHeader title={t('nav.trialBalance')} />
      <Card className="mb-4 flex items-center justify-between">
        <span className="text-sm text-foreground-muted">{t('common.status')}</span>
        <Badge tone={data?.balanced ? 'success' : 'danger'}>{data?.balanced ? 'Balanced' : 'Out of balance'}</Badge>
      </Card>
      <Card>
        <Table>
          <thead><tr><Th>{t('field.code')}</Th><Th>{t('field.name')}</Th><Th className="text-right">Debit</Th><Th className="text-right">Credit</Th></tr></thead>
          <tbody>
            {data?.rows?.map((r: any) => (
              <tr key={r.code}>
                <Td className="tabular">{r.code}</Td><Td>{r.name}</Td>
                <Td className="text-right tabular">{fmt.money(r.debit)}</Td>
                <Td className="text-right tabular">{fmt.money(r.credit)}</Td>
              </tr>
            ))}
            <tr className="font-bold">
              <Td colSpan={2}>{t('trialBalance.total')}</Td>
              <Td className="text-right tabular">{fmt.money(data?.totalDebit ?? 0)}</Td>
              <Td className="text-right tabular">{fmt.money(data?.totalCredit ?? 0)}</Td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
