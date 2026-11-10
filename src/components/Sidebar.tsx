import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CreditCard,
  CalendarDays,
  Settings,
  Receipt,
  LogOut,
  LogIn,
  Menu,
  X,
  IndianRupee,
  Users,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ActiveTab } from '../types';

interface SidebarProps {
  onOpenAddIncome: () => void;
  onOpenAddExpense: () => void;
  onOpenRecordPayment: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenAddIncome,
  onOpenAddExpense,
  onOpenRecordPayment,
}) => {
  const { activeTab, setActiveTab, user, signIn, signOut, workspace, workspaceMembers } = useFinance();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Accounts', icon: Building2 },
    { id: 'inflow', label: 'Inflow', icon: ArrowDownLeft },
    { id: 'outflow', label: 'Outflow', icon: ArrowUpRight },
    { id: 'loans', label: 'Loans & EMIs', icon: Landmark },
    { id: 'credit_cards', label: 'Credit Cards', icon: CreditCard },
    { id: 'calendar', label: 'Payment Calendar', icon: CalendarDays },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#FAF8F5] border-b border-stone-200/80 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="p-2 -ml-2 rounded-xl text-stone-600 hover:bg-stone-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <IndianRupee className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-stone-900">
            Money Desk
          </span>
        </div>

        {/* Quick mobile actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenAddExpense}
            aria-label="Add expense"
            className="p-2 rounded-xl bg-white text-stone-700 hover:bg-stone-50 border border-stone-200/80 shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </button>
          <button
            onClick={onOpenAddIncome}
            aria-label="Add income"
            className="p-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-[#FAF8F5] shadow-xl p-5 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-stone-900">Money Desk</h2>
                    <p className="text-[10px] text-stone-500">Shared & Solo Finance</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation items */}
              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-violet-100 text-violet-800 font-semibold'
                          : 'text-stone-600 hover:bg-stone-100/70 hover:text-stone-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-violet-700' : 'text-stone-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Quick Actions in Mobile Drawer */}
              <div className="mt-6 pt-4 border-t border-stone-200 space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-3">
                  Quick Actions
                </span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAddIncome();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-violet-600 text-white text-xs font-semibold flex items-center gap-2 shadow-xs"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Add Income
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAddExpense();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white text-stone-800 border border-stone-200 text-xs font-medium flex items-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  Add Expense
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRecordPayment();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white text-stone-800 border border-stone-200 text-xs font-medium flex items-center gap-2"
                >
                  <Receipt className="w-4 h-4 text-stone-500" />
                  Record Payment
                </button>
              </div>
            </div>

            {/* Workspace & User profile / auth */}
            <div className="pt-4 border-t border-stone-200 space-y-2">
              {workspace && (
                <button
                  onClick={() => handleNavClick('settings')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-violet-50/80 border border-violet-100 text-[11px] text-violet-900 text-left"
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <Users className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span className="font-semibold truncate">{workspace.name || 'Workspace'}</span>
                  </div>
                  <span className="shrink-0 text-[10px] bg-violet-200/70 text-violet-800 px-1.5 py-0.5 rounded-full font-bold">
                    {workspaceMembers.length} {workspaceMembers.length === 1 ? 'member' : 'members'}
                  </span>
                </button>
              )}

              {user ? (
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-stone-900 truncate">
                      {user.displayName || user.email || 'User'}
                    </p>
                    <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signIn}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-[#FAF8F5] border-r border-stone-200/80 flex-col justify-between p-5 z-30">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 pb-5 border-b border-stone-200/80">
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-stone-900">
                Money Desk
              </h1>
              <p className="text-[11px] text-stone-500">
                Shared & Solo Finance
              </p>
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="mt-4 space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-1">
              Quick Actions
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenAddIncome}
                className="py-2 px-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Income
              </button>

              <button
                onClick={onOpenAddExpense}
                className="py-2 px-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-stone-200/80 shadow-xs"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                Expense
              </button>
            </div>

            <button
              onClick={onOpenRecordPayment}
              className="w-full py-2 px-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-stone-200/80 shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5 text-stone-500" />
              Record Payment
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-1 mb-2 block">
              Navigation
            </span>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-100 text-violet-800 font-semibold'
                      : 'text-stone-600 hover:bg-stone-100/70 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-violet-700' : 'text-stone-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Workspace & User Card / Auth */}
        <div className="pt-4 border-t border-stone-200/80 space-y-2">
          {workspace && (
            <button
              onClick={() => handleNavClick('settings')}
              title="Go to Settings → Members"
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-violet-50/80 hover:bg-violet-100/80 border border-violet-100 text-[11px] text-violet-900 transition-colors text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <Users className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span className="font-semibold truncate">{workspace.name || 'Workspace'}</span>
              </div>
              <span className="shrink-0 text-[10px] bg-violet-200/70 text-violet-800 px-1.5 py-0.5 rounded-full font-bold">
                {workspaceMembers.length} {workspaceMembers.length === 1 ? 'member' : 'members'}
              </span>
            </button>
          )}

          {user ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200/80 shadow-xs">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-stone-900 truncate">
                  {user.displayName || user.email || 'User'}
                </p>
                <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signIn}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
