import React, { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  Plus,
  Search,
  Download,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  CreditCard as CardIcon,
  Wallet,
  ShieldCheck,
  Tag,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, OwnerType } from '../../types';
import {
  formatINR,
  formatDateTimeKolkata,
  formatMonthName,
  getPreviousMonthString,
  getNextMonthString,
  getKolkataMonthString,
  getOwnerLabel,
  formatDateKolkata,
} from '../../utils/finance';
import { exportTransactionsToCSV } from '../../utils/csv';

interface OutflowViewProps {
  onOpenAddExpense: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
}

export const OutflowView: React.FC<OutflowViewProps> = ({
  onOpenAddExpense,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const {
    transactions,
    accounts,
    categories,
    creditCards,
    selectedMonth,
    setSelectedMonth,
    person1Name,
    person2Name,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccountOrCard, setSelectedAccountOrCard] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');

  const currentMonthStr = getKolkataMonthString();

  // Filter outflows for selected month
  const filteredOutflows = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.type !== 'outflow') return false;

      // Month filter
      if (!tx.transactionDate.startsWith(selectedMonth)) return false;

      // Category filter
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;

      // Account / Card filter
      if (selectedAccountOrCard !== 'all') {
        if (selectedAccountOrCard.startsWith('acc_')) {
          if (tx.accountId !== selectedAccountOrCard) return false;
        } else if (selectedAccountOrCard.startsWith('card_')) {
          if (tx.creditCardId !== selectedAccountOrCard) return false;
        }
      }

      // Owner filter
      if (selectedOwner !== 'all') {
        if (selectedOwner === 'unassigned') {
          if (tx.owner && tx.owner !== 'unassigned') return false;
        } else if (tx.owner !== selectedOwner) {
          return false;
        }
      }

      // Search query (merchant or payee or notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMerchant = (tx.sourceOrMerchant || '').toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        const matchCat = (tx.category || '').toLowerCase().includes(q);
        if (!matchMerchant && !matchNotes && !matchCat) return false;
      }

      return true;
    });
  }, [transactions, selectedMonth, selectedCategory, selectedAccountOrCard, selectedOwner, searchQuery]);

  // Outflow Metrics
  const { totalSpendingPaise, totalCashPaidOutPaise, categoryBreakdown } = useMemo(() => {
    let spending = 0;
    let cashPaid = 0;
    const catMap: Record<string, number> = {};

    filteredOutflows.forEach((tx) => {
      // Exclude debt payments (card bill / loan EMI) from category spending to prevent double count
      if (!tx.isDebtPayment) {
        spending += tx.amountPaise;
        const c = tx.category || 'General';
        catMap[c] = (catMap[c] || 0) + tx.amountPaise;
      }

      // Cash paid directly from bank/cash account
      if (!tx.creditCardId) {
        cashPaid += tx.amountPaise;
      }
    });

    const breakdown = Object.entries(catMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalSpendingPaise: spending,
      totalCashPaidOutPaise: cashPaid,
      categoryBreakdown: breakdown,
    };
  }, [filteredOutflows]);

  // Group by transactionDate
  const groupedByDay = useMemo(() => {
    const groups: Record<string, { date: string; totalPaise: number; items: Transaction[] }> = {};

    filteredOutflows.forEach((tx) => {
      const d = tx.transactionDate;
      if (!groups[d]) {
        groups[d] = { date: d, totalPaise: 0, items: [] };
      }
      groups[d].totalPaise += tx.amountPaise;
      groups[d].items.push(tx);
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOutflows]);

  const outflowCats = categories.filter((c) => c.type === 'outflow');

  const handleExportCSV = () => {
    exportTransactionsToCSV(
      filteredOutflows,
      accounts,
      creditCards,
      `moneydesk-outflow-${selectedMonth}.csv`
    );
  };

  const getSourceDisplay = (tx: Transaction) => {
    if (tx.creditCardId) {
      const card = creditCards.find((c) => c.id === tx.creditCardId);
      return {
        label: card ? card.nickname : 'Credit Card',
        isCard: true,
      };
    }
    if (tx.accountId) {
      const acc = accounts.find((a) => a.id === tx.accountId);
      return {
        label: acc ? acc.nickname || acc.name : 'Bank Account',
        isCard: false,
      };
    }
    return null;
  };

  const getOwnerBadge = (owner?: OwnerType) => {
    if (owner === 'person1') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
          {person1Name}
        </span>
      );
    }
    if (owner === 'person2') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
          {person2Name}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Unassigned
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Outflow</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Spending by category, cash paid out, and card purchases
          </p>
        </div>

        <button
          onClick={onOpenAddExpense}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Expense
        </button>
      </div>

      {/* Summary Card with Integrated Month Picker */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Monthly Spending • {formatMonthName(selectedMonth)}
          </span>
          <div className="text-3xl font-bold text-stone-900 tracking-tight mt-1 tabular-nums">
            {formatINR(totalSpendingPaise)}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Cash paid from banks: <strong className="text-stone-700">{formatINR(totalCashPaidOutPaise)}</strong> • {filteredOutflows.length} transactions
          </p>
        </div>

        {/* Month Navigation Control */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-[#FAF8F5] rounded-xl p-1 border border-stone-200 shadow-2xs">
            <button
              onClick={() => setSelectedMonth(getPreviousMonthString(selectedMonth))}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-stone-800 whitespace-nowrap min-w-[90px] text-center">
              {formatMonthName(selectedMonth)}
            </span>
            <button
              onClick={() => setSelectedMonth(getNextMonthString(selectedMonth))}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {selectedMonth !== currentMonthStr && (
            <button
              onClick={() => setSelectedMonth(currentMonthStr)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-100 transition-colors shadow-2xs"
            >
              Current Month
            </button>
          )}
        </div>
      </div>

      {/* Category Breakdown Chips (Clean & Compact) */}
      {categoryBreakdown.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Spending by Category
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {categoryBreakdown.map((cat) => {
              const pct = totalSpendingPaise > 0 ? Math.round((cat.amount / totalSpendingPaise) * 100) : 0;
              return (
                <div
                  key={cat.name}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-stone-200/80 flex items-center gap-2 text-xs"
                >
                  <span className="font-semibold text-stone-800">{cat.name}</span>
                  <span className="text-stone-500 tabular-nums">{formatINR(cat.amount)}</span>
                  <span className="text-[10px] font-bold text-violet-700 bg-violet-100/70 px-1.5 py-0.2 rounded-md">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant, notes, category..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-[#FAF8F5] text-stone-900 text-xs focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-[#FAF8F5] text-stone-700 text-xs font-medium focus:ring-1 focus:ring-violet-500"
          >
            <option value="all">All Categories</option>
            {outflowCats.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Account / Card Filter */}
          <select
            value={selectedAccountOrCard}
            onChange={(e) => setSelectedAccountOrCard(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-[#FAF8F5] text-stone-700 text-xs font-medium focus:ring-1 focus:ring-violet-500"
          >
            <option value="all">All Accounts & Cards</option>
            <optgroup label="Bank Accounts">
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nickname || acc.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Credit Cards">
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.nickname} ({card.issuer})
                </option>
              ))}
            </optgroup>
          </select>

          {/* Partner Filter */}
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-[#FAF8F5] text-stone-700 text-xs font-medium focus:ring-1 focus:ring-violet-500"
          >
            <option value="all">All Attributions</option>
            <option value="person1">{person1Name}</option>
            <option value="person2">{person2Name}</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {/* CSV Export */}
        <button
          onClick={handleExportCSV}
          disabled={filteredOutflows.length === 0}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5 text-stone-500" />
          Export CSV
        </button>
      </div>

      {/* Transaction List Grouped by Day */}
      {groupedByDay.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-800">No expenses found</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            No spending recorded for {formatMonthName(selectedMonth)} matching your filters.
          </p>
          <button
            onClick={onOpenAddExpense}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-xs inline-flex items-center gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" /> Record Expense
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map((group) => (
            <div
              key={group.date}
              className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden"
            >
              {/* Day Header */}
              <div className="px-5 py-3 bg-[#FAF8F5] border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span className="text-xs font-bold text-stone-800">
                    {formatDateKolkata(group.date)}
                  </span>
                </div>
                <span className="text-xs font-bold text-stone-900 tabular-nums">
                  -{formatINR(group.totalPaise)}
                </span>
              </div>

              {/* Day Transactions */}
              <div className="divide-y divide-stone-100">
                {group.items.map((tx) => {
                  const source = getSourceDisplay(tx);

                  return (
                    <div
                      key={tx.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-900 truncate">
                              {tx.sourceOrMerchant}
                            </span>
                            {getOwnerBadge(tx.owner)}
                            {tx.isDebtPayment && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                                Debt / Bill Payment
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium">
                              {tx.category || 'General'}
                            </span>
                            {source && (
                              <span className="flex items-center gap-1 text-stone-500">
                                {source.isCard ? (
                                  <CardIcon className="w-3 h-3 text-stone-400" />
                                ) : (
                                  <Wallet className="w-3 h-3 text-stone-400" />
                                )}
                                {source.label}
                              </span>
                            )}
                            {tx.notes && (
                              <span className="text-stone-400 italic truncate max-w-xs">
                                "{tx.notes}"
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-stone-900 tabular-nums">
                          -{formatINR(tx.amountPaise)}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
