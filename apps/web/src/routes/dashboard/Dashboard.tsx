import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { PageHeader, StatCard } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

export default function Dashboard() {
  const { t } = useLang();
  const fmt = useFmt();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get('/reports/dashboard')).data });
  if (isLoading) return <p>{t('common.loading')}</p>;

  const cards = [
    { label: t('label.netProfit'), value: fmt.money(data?.netProfit ?? 0), tone: 'text-success' },
    { label: t('label.receivables'), value: fmt.money(data?.receivables ?? 0), tone: 'text-warning' },
    { label: t('label.payables'), value: fmt.money(data?.payables ?? 0), tone: 'text-danger' },
    { label: t('label.lowStock'), value: (data?.lowStockCount ?? 0).toString(), tone: 'text-info' },
    { label: t('label.cashBalance'), value: fmt.money(data?.cashBalance ?? 0), tone: 'text-foreground' },
    { label: t('label.bankBalance'), value: fmt.money(data?.bankBalance ?? 0), tone: 'text-foreground' },
  ];

  return (
    <div>
      <PageHeader title={t('nav.dashboard')} subtitle={t('fiscalYear') + ': ' + fmt.fiscalYear()} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} tone={c.tone} />
        ))}
      </div>
      <Card className="mt-4">
        <p className="text-sm">
          {t('label.trialBalance')}:{' '}
          {data?.trialBalanceBalanced ? (
            <span className="text-success font-medium">{t('label.balanced')}</span>
          ) : (
            <span className="text-danger font-medium">{t('label.outOfBalance')}</span>
          )}
        </p>
      </Card>
    </div>
  );
}
