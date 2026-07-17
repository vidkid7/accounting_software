import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Card, Table, Th, Td, Badge } from '../../components/ui';
import { PageHeader, Empty } from '../../components/crud';
import { useLang } from '../../store/lang';
import { useFmt } from '../../lib/format';

export default function Pos() {
  const qc = useQueryClient();
  const { t } = useLang();
  const fmt = useFmt();
  const products = useQuery({ queryKey: ['products'], queryFn: async () => (await api.get('/inventory/products')).data });
  const sales = useQuery({ queryKey: ['pos-sales'], queryFn: async () => (await api.get('/sales/pos/sales')).data });

  const [cart, setCart] = useState<any[]>([]);
  const checkout = useMutation({
    mutationFn: (body: any) => api.post('/sales/pos/checkout', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos-sales'] }); setCart([]); },
  });

  function addToCart(p: any) {
    setCart((c) => [...c, { productId: p.id, name: p.name, quantity: 1, rate: p.salePrice }]);
  }
  const total = cart.reduce((s, x) => s + Number(x.quantity) * Number(x.rate), 0);

  return (
    <div>
      <PageHeader title={t('nav.pos')} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <p className="text-sm font-medium text-foreground-muted mb-3">{t('common.product')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {products.data?.map((p: any) => (
              <button key={p.id} className="p-3 border border-border rounded-btn text-left hover:bg-surface-muted" onClick={() => addToCart(p)}>
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs tabular text-foreground-muted">{fmt.money(p.salePrice)}</p>
              </button>
            ))}
            {products.data?.length === 0 && <Empty>{t('common.none')}</Empty>}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-medium text-foreground-muted mb-3">{t('common.actions')}</p>
          {cart.map((x, i) => (
            <div key={i} className="flex justify-between items-center py-1 text-sm">
              <span>{x.name}</span>
              <span className="tabular">{fmt.money(Number(x.quantity) * Number(x.rate))}</span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 font-semibold tabular">Total: {fmt.money(total)}</div>
          <Button className="w-full mt-3" onClick={() => checkout.mutate({ items: cart })} disabled={checkout.isPending || cart.length === 0}>
            {t('action.pay')}
          </Button>
        </Card>
      </div>
      <Card className="mt-4">
        <p className="text-sm font-medium text-foreground-muted mb-3">Recent Sales</p>
        <Table>
          <thead><tr><Th>#</Th><Th>{t('common.status')}</Th><Th className="text-right">{t('common.total')}</Th></tr></thead>
          <tbody>
            {sales.data?.map((s: any, i: number) => (
              <tr key={s.id}><Td className="tabular">#{i + 1}</Td><Td><Badge tone="success">{s.status}</Badge></Td><Td className="text-right tabular">{fmt.money(s.total ?? 0)}</Td></tr>
            ))}
            {sales.data?.length === 0 && <tr><td colSpan={3}><Empty>{t('common.none')}</Empty></td></tr>}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
