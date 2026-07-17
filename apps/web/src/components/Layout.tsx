import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Warehouse, FileText, Users, ShoppingCart, Truck,
  BookOpen, Landmark, Receipt, Building2, Coins, Monitor, GitBranch, Plug,
  BarChart3, Scale, LogOut, Languages, Menu, X,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { useLang } from '../store/lang';
import { cn } from './ui';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTANT' | 'SALES_STAFF' | 'STORE_STAFF' | 'AUDITOR';

type NavItem = { to: string; key: string; icon: any; roles: Role[] };

const ALL: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'SALES_STAFF', 'STORE_STAFF', 'AUDITOR'];
const MGT: Role[] = ['SUPER_ADMIN', 'ADMIN'];
const FIN: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'];
const SALES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'SALES_STAFF'];
const STORE: Role[] = ['SUPER_ADMIN', 'ADMIN', 'STORE_STAFF'];
const REPORT: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR'];

const nav: NavItem[] = [
  { to: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard, roles: ALL },
  { to: '/inventory/products', key: 'nav.products', icon: Package, roles: STORE },
  { to: '/inventory/warehouses', key: 'nav.warehouses', icon: Warehouse, roles: STORE },
  { to: '/sales/invoices', key: 'nav.invoices', icon: FileText, roles: SALES },
  { to: '/sales/customers', key: 'nav.customers', icon: Users, roles: SALES },
  { to: '/purchase/bills', key: 'nav.bills', icon: ShoppingCart, roles: FIN },
  { to: '/purchase/vendors', key: 'nav.vendors', icon: Truck, roles: FIN },
  { to: '/accounting/accounts', key: 'nav.accounts', icon: BookOpen, roles: FIN },
  { to: '/accounting/bank', key: 'nav.bank', icon: Landmark, roles: FIN },
  { to: '/accounting/expenses', key: 'nav.expenses', icon: Receipt, roles: FIN },
  { to: '/accounting/assets', key: 'nav.assets', icon: Building2, roles: FIN },
  { to: '/accounting/fx', key: 'nav.fx', icon: Coins, roles: FIN },
  { to: '/sales/pos', key: 'nav.pos', icon: Monitor, roles: SALES },
  { to: '/company/branches', key: 'nav.branches', icon: GitBranch, roles: MGT },
  { to: '/integrations', key: 'nav.integrations', icon: Plug, roles: MGT },
  { to: '/reports', key: 'nav.reports', icon: BarChart3, roles: REPORT },
  { to: '/accounting/trial-balance', key: 'nav.trialBalance', icon: Scale, roles: REPORT },
];

export function Layout() {
  const { logout, user } = useAuth();
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role = (user?.role as Role) ?? 'AUDITOR';

  const visible = nav.filter((n) => n.roles.includes(role));

  const SidebarContent = (
    <>
      <div className="h-14 flex items-center justify-between px-4 sm:px-6 font-bold text-brand">
        <span>{t('app.name')}</span>
        {/* Close button only on mobile */}
        <button className="lg:hidden p-1 -mr-1 text-foreground-muted" onClick={() => setDrawerOpen(false)} aria-label={t('common.close')}>
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium',
                isActive ? 'bg-brand-soft text-brand' : 'text-foreground-muted hover:bg-surface-muted',
              )
            }
          >
            <item.icon size={18} className="shrink-0" />
            <span className="truncate">{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-1">
        <div className="flex items-center gap-2 px-1 mb-1">
          <Languages size={16} className="text-foreground-muted" />
          <button
            className={cn('px-2 py-1 rounded-btn text-xs', lang === 'en' ? 'bg-brand text-white' : 'text-foreground-muted hover:bg-surface-muted')}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            className={cn('px-2 py-1 rounded-btn text-xs', lang === 'ne' ? 'bg-brand text-white' : 'text-foreground-muted hover:bg-surface-muted')}
            onClick={() => setLang('ne')}
          >
            ने
          </button>
        </div>
        <button
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-btn text-sm text-foreground-muted hover:bg-surface-muted"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <LogOut size={18} className="shrink-0" />
          <span className="truncate">{t('action.logout')} ({t(`role.${role}`)})</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-border flex-col shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside className="relative w-64 max-w-[80%] bg-white border-r border-border flex flex-col shrink-0 shadow-xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-white border-b border-border">
          <button className="p-1 -ml-1 text-foreground" onClick={() => setDrawerOpen(true)} aria-label={t('common.menu')}>
            <Menu size={22} />
          </button>
          <span className="font-bold text-brand">{t('app.name')}</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-surface min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
