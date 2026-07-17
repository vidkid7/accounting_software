import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td } from '../../components/ui';
import { PageHeader, StatCard } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

export default function Reports() {
  const { t } = useLang();
  const fmt = useFmt();
  const consolidated = useQuery({ queryKey: ['reports-consolidated'], queryFn: async () => (await api.get('/reports/consolidated')).data });
  const sales = useQuery({ queryKey: ['reports-sales'], queryFn: async () => (await api.get('/reports/sales')).data });

  return (
    <div>
      <PageHeader title={t('nav.reports')}
        subtitle={t('fiscalYear') + ': ' + fmt.fiscalYear()}
        action={<a href="/api/integrations/export/ledger.csv"><Button variant="secondary">{t('action.export')}</Button></a>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label={t('label.totalSales')} value={fmt.money(consolidated.data?.totalSales ?? 0)} tone="text-success" />
        <StatCard label={t('label.totalTax')} value={fmt.money(consolidated.data?.totalTax ?? 0)} tone="text-info" />
        <StatCard label={t('common.branch')} value={(consolidated.data?.branches?.length ?? 0).toString()} />
      </div>
      <Card>
        <p className="font-medium mb-3">{t('label.consolidatedByBranch')}</p>
        <Table>
          <thead><tr><Th>{t('common.branch')}</Th><Th className="text-right">{t('label.totalSales')}</Th><Th className="text-right">{t('label.totalTax')}</Th></tr></thead>
          <tbody>
            {consolidated.data?.branches?.map((b: any) => (
              <tr key={b.branchId}><Td>{b.branchName ?? t('common.unallocated')}</Td><Td className="text-right tabular">{fmt.money(b.sales ?? 0)}</Td><Td className="text-right tabular">{fmt.money(b.tax ?? 0)}</Td></tr>
            ))}
            {!consolidated.data?.branches?.length && <tr><td colSpan={3} className="px-4 py-3 text-foreground-muted text-sm">—</td></tr>}
          </tbody>
        </Table>
      </Card>
      <Card className="mt-4">
        <p className="font-medium mb-3">{t('label.topSales')}</p>
        <Table>
          <thead><tr><Th>{t('common.invoice')}</Th><Th>{t('field.customer')}</Th><Th className="text-right">{t('common.total')}</Th></tr></thead>
          <tbody>
            {sales.data?.slice(0, 10).map((s: any) => (
              <tr key={s.id}><Td className="tabular">{s.number}</Td><Td>{s.customer?.name ?? '-'}</Td><Td className="text-right tabular">{fmt.money(s.total ?? 0)}</Td></tr>
            ))}
            {!sales.data?.length && <tr><td colSpan={3} className="px-4 py-3 text-foreground-muted text-sm">—</td></tr>}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
