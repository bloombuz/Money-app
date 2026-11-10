import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  PlusCircle,
  PieChart,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Building2,
  Users,
  User,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatINR,
  formatMonthName,
  getPreviousMonthString,
  getNextMonthString,
  getKolkataMonthString,
  calculateCreditCardMetrics,
  getOwnerLabel,
} from '../../utils/finance';

interface DashboardViewProps {
  onOpenAddIncome: () => void;
  onOpenAddExpense: () => void;
  onOpenRecordPayment: () => void;
  onOpenAddCard?: () => void;
  onOpenAddLoan?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddIncome,
  onOpenAddExpense,
  onOpenRecordPayment,
  onOpenAddCard,
  onOpenAddLoan,
}) => {
  const {
    accounts,
    transactions,
    loans,
    installments,
    creditCards,
    statements,
    payments,
    assets,
    person1Name,
    person2Name,
    dashboardFilter,
    setDashboardFilter,
    getAccountBalance,
    selectedMonth,
    setSelectedMonth,
    customDateRange,
    setCustomDateRange,
    setActiveTab,
    loadingAuth,
    loadingData,
    dataError,
    refreshData,
  } = useFinance();

  const prevMonth = useMemo(() => getPreviousMonthString(selectedMonth), [selectedMonth]);

  // Date filter helper
  const isInSelectedPeriod = (txDate: string) => {
    if (customDateRange) {
      return txDate >= customDateRange.start && txDate <= customDateRange.end;
    }
    return txDate.startsWith(selectedMonth);
  };

  const isInPrevPeriod = (txDate: string) => {
    return txDate.startsWith(prevMonth);
  };

  // Check for any unassigned records across accounts, cards, loans, assets
  const unassignedCounts = useMemo(() => {
    const unacc = accounts.filter((a) => !a.owner || a.owner === 'unassigned').length;
    const uncard = creditCards.filter((c) => !c.owner || c.owner === 'unassigned').length;
    const unloan = loans.filter((l) => !l.owner || l.owner === 'unassigned').length;
    const unasset = assets.filter((a) => !a.owner || a.owner === 'unassigned').length;
    return unacc + uncard + unloan + unasset;
  }, [accounts, creditCards, loans, assets]);

  // Helper to compute Net Worth for a specific person ('person1' | 'person2')
  const computePersonNetWorth = (person: 'person1' | 'person2') => {
    // 1. Bank balances assigned to person
    const personAccounts = accounts.filter((a) => a.owner === person);
    const bankBalancesPaise = personAccounts.reduce(
      (sum, a) => sum + getAccountBalance(a.id),
      0
    );

    // 2. Manual assets assigned to person
    const personAssets = assets.filter((a) => a.owner === person);
    const manualAssetsPaise = personAssets.reduce(
      (sum, a) => sum + (a.valuePaise || 0),
      0
    );

    const totalAssetsPaise = bankBalancesPaise + manualAssetsPaise;

    // 3. Loans assigned to person
    const personLoans = loans.filter((l) => l.owner === person);
    const loanDebtPaise = personLoans.reduce(
      (sum, l) => sum + (l.currentOutstandingPaise || 0),
      0
    );

    // 4. Credit cards assigned to person
    const personCards = creditCards.filter((c) => c.owner === person);
    let cardDebtPaise = 0;
    personCards.forEach((c) => {
      const cardPurchases = transactions
        .filter((t) => t.type === 'outflow' && t.creditCardId === c.id)
        .reduce((sum, t) => sum + t.amountPaise, 0);

      const cardPayments = payments
        .filter((p) => p.targetType === 'credit_card' && p.targetId === c.id)
        .reduce((sum, p) => sum + p.amountPaise, 0);

      const cardStmtsRemaining = statements
        .filter((s) => s.creditCardId === c.id)
        .reduce((sum, s) => sum + Math.max(0, s.totalAmountDuePaise - s.paidAmountPaise), 0);

      const cardMetrics = calculateCreditCardMetrics({
        openingBalancePaise: c.openingBalancePaise || 0,
        reconciliationAdjustmentPaise: c.reconciliationAdjustmentPaise || 0,
        purchasesPaise: cardPurchases,
        paymentsPaise: cardPayments,
        unpaidStatementsRemainingPaise: cardStmtsRemaining,
      });

      cardDebtPaise += cardMetrics.currentOutstandingPaise;
    });

    const totalDebtPaise = loanDebtPaise + cardDebtPaise;
    const netWorthPaise = totalAssetsPaise - totalDebtPaise;

    // Monthly commitments (EMIs + card minimums for current month)
    const personLoanIds = new Set(personLoans.map((l) => l.id));
    const personCardIds = new Set(personCards.map((c) => c.id));

    const monthlyEmiDuePaise = installments
      .filter((i) => personLoanIds.has(i.loanId) && i.month === selectedMonth)
      .reduce((sum, i) => sum + Math.max(0, i.scheduledAmountPaise - i.paidAmountPaise), 0);

    const monthlyCardDuePaise = statements
      .filter((s) => personCardIds.has(s.creditCardId) && s.statementMonth === selectedMonth)
      .reduce((sum, s) => sum + Math.max(0, s.totalAmountDuePaise - s.paidAmountPaise), 0);

    const monthlyObligationsPaise = monthlyEmiDuePaise + monthlyCardDuePaise;

    return {
      netWorthPaise,
      totalAssetsPaise,
      bankBalancesPaise,
      manualAssetsPaise,
      totalDebtPaise,
      loanDebtPaise,
      cardDebtPaise,
      monthlyObligationsPaise,
      accountCount: personAccounts.length,
      assetCount: personAssets.length,
      debtCount: personLoans.length + personCards.length,
    };
  };

  const person1NetWorth = useMemo(() => computePersonNetWorth('person1'), [
    accounts,
    assets,
    loans,
    creditCards,
    transactions,
    payments,
    statements,
    installments,
    selectedMonth,
  ]);

  const person2NetWorth = useMemo(() => computePersonNetWorth('person2'), [
    accounts,
    assets,
    loans,
    creditCards,
    transactions,
    payments,
    statements,
    installments,
    selectedMonth,
  ]);

  // Combined Money in Banks (Separate from Net Worth)
  const bankHoldings = useMemo(() => {
    let list = accounts.map((a) => ({
      ...a,
      currentBalancePaise: getAccountBalance(a.id),
    }));

    if (dashboardFilter !== 'both') {
      list = list.filter((a) => a.owner === dashboardFilter);
    }

    const totalPaise = list.reduce((sum, a) => sum + a.currentBalancePaise, 0);
    return { list, totalPaise };
  }, [accounts, dashboardFilter, transactions]);

  // Filtered Monthly Cashflow Metrics based on dashboardFilter ('both', 'person1', 'person2')
  const metrics = useMemo(() => {
    let incomePaise = 0;
    let prevIncomePaise = 0;

    let categorySpendingPaise = 0;
    let prevCategorySpendingPaise = 0;

    let cashPaidOutPaise = 0;
    let prevCashPaidOutPaise = 0;

    const categoryMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      // Exclude transfers from income / spending
      if (tx.type === 'transfer') return;

      // Filter by person if not 'both'
      if (dashboardFilter !== 'both' && tx.owner !== dashboardFilter) {
        return;
      }

      // Selected Month
      if (isInSelectedPeriod(tx.transactionDate)) {
        if (tx.type === 'inflow') {
          incomePaise += tx.amountPaise;
        } else if (tx.type === 'outflow') {
          if (!tx.isDebtPayment) {
            categorySpendingPaise += tx.amountPaise;
            const cat = tx.category || 'General';
            categoryMap[cat] = (categoryMap[cat] || 0) + tx.amountPaise;
          }

          if (!tx.creditCardId) {
            cashPaidOutPaise += tx.amountPaise;
          }
        }
      }

      // Previous Month Comparison
      if (isInPrevPeriod(tx.transactionDate)) {
        if (tx.type === 'inflow') {
          prevIncomePaise += tx.amountPaise;
        } else if (tx.type === 'outflow') {
          if (!tx.isDebtPayment) {
            prevCategorySpendingPaise += tx.amountPaise;
          }
          if (!tx.creditCardId) {
            prevCashPaidOutPaise += tx.amountPaise;
          }
        }
      }
    });

    const netCashMovementPaise = incomePaise - cashPaidOutPaise;
    const prevNetCashMovementPaise = prevIncomePaise - prevCashPaidOutPaise;

    const topCategories = Object.entries(categoryMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      incomePaise,
      prevIncomePaise,
      categorySpendingPaise,
      prevCategorySpendingPaise,
      cashPaidOutPaise,
      prevCashPaidOutPaise,
      netCashMovementPaise,
      prevNetCashMovementPaise,
      topCategories,
    };
  }, [transactions, selectedMonth, customDateRange, prevMonth, dashboardFilter]);

  // Next Payments Due (Upcoming loan EMIs & card statements)
  const nextPaymentsDue = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      type: 'loan' | 'card';
      dueDate: string;
      amountDuePaise: number;
      status: string;
      owner?: string;
    }> = [];

    // Loan installments
    installments.forEach((inst) => {
      const remaining = Math.max(0, inst.scheduledAmountPaise - inst.paidAmountPaise);
      if (remaining > 0 && inst.status !== 'paid') {
        const loan = loans.find((l) => l.id === inst.loanId);
        if (dashboardFilter === 'both' || (loan && loan.owner === dashboardFilter)) {
          list.push({
            id: inst.id,
            title: loan ? `${loan.lender} • ${loan.loanName}` : 'Loan EMI',
            type: 'loan',
            dueDate: inst.dueDate,
            amountDuePaise: remaining,
            status: inst.status,
            owner: loan?.owner,
          });
        }
      }
    });

    // Card statements
    statements.forEach((stmt) => {
      const remaining = Math.max(0, stmt.totalAmountDuePaise - stmt.paidAmountPaise);
      if (remaining > 0 && stmt.status !== 'paid') {
        const card = creditCards.find((c) => c.id === stmt.creditCardId);
        if (dashboardFilter === 'both' || (card && card.owner === dashboardFilter)) {
          list.push({
            id: stmt.id,
            title: card ? `${card.nickname} (${card.issuer})` : 'Card Statement',
            type: 'card',
            dueDate: stmt.dueDate,
            amountDuePaise: remaining,
            status: stmt.status,
            owner: card?.owner,
          });
        }
      }
    });

    list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return list.slice(0, 5);
  }, [installments, loans, statements, creditCards, dashboardFilter]);

  const calcDiffPercent = (curr: number, prev: number) => {
    if (prev === 0) return null;
    const diff = ((curr - prev) / prev) * 100;
    return diff.toFixed(1);
  };

  const isWorkspaceEmpty = transactions.length === 0 && loans.length === 0 && creditCards.length === 0 && accounts.length === 0;

  // Loading state
  if (loadingAuth || loadingData) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 animate-pulse">
          <div className="h-6 w-48 bg-stone-200 rounded" />
          <div className="h-4 w-72 bg-stone-100 rounded mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-white rounded-2xl border border-stone-200/80 animate-pulse" />
          <div className="h-44 bg-white rounded-2xl border border-stone-200/80 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (dataError) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-stone-900">Failed to load saved records</h2>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">{dataError}</p>
        </div>
        <button
          onClick={() => refreshData()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Filter Bar: Both / Person1 / Person2 + Month Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        {/* Person Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl border border-stone-200/60 self-start md:self-auto">
          <button
            onClick={() => setDashboardFilter('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              dashboardFilter === 'both'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-violet-600" />
            Both Combined
          </button>
          <button
            onClick={() => setDashboardFilter('person1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              dashboardFilter === 'person1'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-violet-600" />
            {person1Name}
          </button>
          <button
            onClick={() => setDashboardFilter('person2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              dashboardFilter === 'person2'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-purple-600" />
            {person2Name}
          </button>
        </div>

        {/* Month Selector / Range */}
        <div className="flex flex-wrap items-center gap-2">
          {customDateRange ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-800 border border-violet-200 text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-violet-700" />
              <span>
                {customDateRange.start} to {customDateRange.end}
              </span>
              <button
                onClick={() => setCustomDateRange(null)}
                className="ml-1 text-xs hover:underline text-violet-700 font-semibold"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="flex items-center bg-stone-100 rounded-xl p-0.5 border border-stone-200">
              <button
                onClick={() => setSelectedMonth(prevMonth)}
                aria-label="Previous month"
                className="p-1.5 rounded-lg hover:bg-white text-stone-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 py-1 text-xs font-semibold text-stone-900">
                {formatMonthName(selectedMonth)}
              </div>

              <button
                onClick={() => setSelectedMonth(getNextMonthString(selectedMonth))}
                aria-label="Next month"
                className="p-1.5 rounded-lg hover:bg-white text-stone-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            type="month"
            aria-label="Select month"
            value={selectedMonth}
            onChange={(e) => {
              if (e.target.value) {
                setCustomDateRange(null);
                setSelectedMonth(e.target.value);
              }
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
          />

          {selectedMonth !== getKolkataMonthString() && (
            <button
              onClick={() => {
                setCustomDateRange(null);
                setSelectedMonth(getKolkataMonthString());
              }}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Unassigned Warning Banner */}
      {unassignedCounts > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Totals marked incomplete:</strong> You have {unassignedCounts} unassigned account(s), loan(s), card(s), or asset(s). Assign them to <em>{person1Name}</em> or <em>{person2Name}</em> in Accounts/Settings.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('accounts')}
            className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-semibold hover:bg-amber-100 transition-colors shrink-0"
          >
            Review Accounts
          </button>
        </div>
      )}

      {/* Two Compact Net Worth Cards: Side by Side on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Person 1 Net Worth Card */}
        <div
          className={`p-5 rounded-2xl bg-white border transition-all shadow-xs ${
            dashboardFilter === 'person1' ? 'ring-2 ring-violet-500 border-violet-300' : 'border-stone-200/80'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
                {person1Name.slice(0, 1)}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{person1Name}'s Net Worth</h3>
                <span className="text-[11px] text-stone-400">Assets − Total Debt</span>
              </div>
            </div>
            {unassignedCounts > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Incomplete
              </span>
            )}
          </div>

          <div className="text-3xl font-bold text-stone-900 tabular-nums my-2">
            {formatINR(person1NetWorth.netWorthPaise)}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-100 text-xs mt-3">
            <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100/60">
              <span className="text-[11px] font-semibold text-emerald-800 block">Assets</span>
              <div className="text-base font-bold text-emerald-900 tabular-nums mt-0.5">
                {formatINR(person1NetWorth.totalAssetsPaise)}
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">
                Banks: {formatINR(person1NetWorth.bankBalancesPaise)} • Other: {formatINR(person1NetWorth.manualAssetsPaise)}
              </div>
            </div>

            <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100/60">
              <span className="text-[11px] font-semibold text-rose-800 block">Debt</span>
              <div className="text-base font-bold text-rose-900 tabular-nums mt-0.5">
                {formatINR(person1NetWorth.totalDebtPaise)}
              </div>
              <div className="text-[10px] text-rose-700 mt-0.5">
                Loans: {formatINR(person1NetWorth.loanDebtPaise)} • Cards: {formatINR(person1NetWorth.cardDebtPaise)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2.5 mt-2.5 border-t border-stone-100">
            <span>This Month's Obligations:</span>
            <span className="font-semibold text-stone-800 tabular-nums">
              {formatINR(person1NetWorth.monthlyObligationsPaise)}
            </span>
          </div>
        </div>

        {/* Person 2 Net Worth Card */}
        <div
          className={`p-5 rounded-2xl bg-white border transition-all shadow-xs ${
            dashboardFilter === 'person2' ? 'ring-2 ring-purple-500 border-purple-300' : 'border-stone-200/80'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                {person2Name.slice(0, 1)}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{person2Name}'s Net Worth</h3>
                <span className="text-[11px] text-stone-400">Assets − Total Debt</span>
              </div>
            </div>
            {unassignedCounts > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Incomplete
              </span>
            )}
          </div>

          <div className="text-3xl font-bold text-stone-900 tabular-nums my-2">
            {formatINR(person2NetWorth.netWorthPaise)}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-100 text-xs mt-3">
            <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100/60">
              <span className="text-[11px] font-semibold text-emerald-800 block">Assets</span>
              <div className="text-base font-bold text-emerald-900 tabular-nums mt-0.5">
                {formatINR(person2NetWorth.totalAssetsPaise)}
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">
                Banks: {formatINR(person2NetWorth.bankBalancesPaise)} • Other: {formatINR(person2NetWorth.manualAssetsPaise)}
              </div>
            </div>

            <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100/60">
              <span className="text-[11px] font-semibold text-rose-800 block">Debt</span>
              <div className="text-base font-bold text-rose-900 tabular-nums mt-0.5">
                {formatINR(person2NetWorth.totalDebtPaise)}
              </div>
              <div className="text-[10px] text-rose-700 mt-0.5">
                Loans: {formatINR(person2NetWorth.loanDebtPaise)} • Cards: {formatINR(person2NetWorth.cardDebtPaise)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2.5 mt-2.5 border-t border-stone-100">
            <span>This Month's Obligations:</span>
            <span className="font-semibold text-stone-800 tabular-nums">
              {formatINR(person2NetWorth.monthlyObligationsPaise)}
            </span>
          </div>
        </div>
      </div>

      {/* Money in Banks (Separated from Net Worth) */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Money in Banks</h2>
              <span className="text-[11px] text-stone-500">
                Liquid cash & bank holdings ({dashboardFilter === 'both' ? 'Both Combined' : dashboardFilter === 'person1' ? person1Name : person2Name})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-stone-900 tabular-nums">
              {formatINR(bankHoldings.totalPaise)}
            </span>
            <button
              onClick={() => setActiveTab('accounts')}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              Manage Accounts <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Account balance chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          {bankHoldings.list.map((a) => (
            <div
              key={a.id}
              className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-stone-200/70 text-xs flex items-center gap-2"
            >
              <span className="text-stone-600 font-medium">{a.nickname || a.name}:</span>
              <span className="font-bold text-stone-900 tabular-nums">
                {formatINR(a.currentBalancePaise)}
              </span>
              <span className="text-[10px] text-stone-400">
                ({getOwnerLabel(a.owner, person1Name, person2Name)})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Cash Flow KPIs (Filtered by selected person) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Income Received */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Income Received
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-stone-900 tabular-nums">
            {formatINR(metrics.incomePaise)}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-400 mt-2">
            <span>Prev Month: {formatINR(metrics.prevIncomePaise)}</span>
            {calcDiffPercent(metrics.incomePaise, metrics.prevIncomePaise) && (
              <span className="font-semibold text-emerald-600">
                {metrics.incomePaise >= metrics.prevIncomePaise ? '↑' : '↓'}
                {calcDiffPercent(metrics.incomePaise, metrics.prevIncomePaise)}%
              </span>
            )}
          </div>
        </div>

        {/* Category Spending */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Spending
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-stone-900 tabular-nums">
            {formatINR(metrics.categorySpendingPaise)}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-400 mt-2">
            <span>Prev Month: {formatINR(metrics.prevCategorySpendingPaise)}</span>
            {calcDiffPercent(metrics.categorySpendingPaise, metrics.prevCategorySpendingPaise) && (
              <span className="font-semibold text-rose-600">
                {metrics.categorySpendingPaise > metrics.prevCategorySpendingPaise ? '↑' : '↓'}
                {calcDiffPercent(metrics.categorySpendingPaise, metrics.prevCategorySpendingPaise)}%
              </span>
            )}
          </div>
        </div>

        {/* Net Cash Movement */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Net Movement
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-3xl font-bold tabular-nums ${
              metrics.netCashMovementPaise >= 0 ? 'text-emerald-700' : 'text-stone-900'
            }`}
          >
            {metrics.netCashMovementPaise >= 0 ? '+' : ''}
            {formatINR(metrics.netCashMovementPaise)}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-400 mt-2">
            <span>Cash Outflows: {formatINR(metrics.cashPaidOutPaise)}</span>
            <span className="text-[11px] text-stone-500">In bank/cash</span>
          </div>
        </div>
      </div>

      {/* Empty State Banner if clean workspace */}
      {isWorkspaceEmpty && (
        <div className="bg-white p-8 rounded-2xl border border-dashed border-stone-300 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-semibold text-stone-900">Fresh Workspace</h3>
            <p className="text-xs text-stone-500 mt-1">
              Add your accounts, record daily income or expense, or load sample records in Settings to explore Money Desk.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenAddIncome}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-xs transition-colors"
            >
              + Add Income
            </button>
            <button
              onClick={onOpenAddExpense}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
            >
              + Add Expense
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
            >
              + Add Bank Account
            </button>
          </div>
        </div>
      )}

      {/* Middle Section: Spending Breakdown & Next Payments Due */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">
                Spending Breakdown ({formatMonthName(selectedMonth)})
              </h2>
              <p className="text-xs text-stone-500">
                {dashboardFilter === 'both' ? 'Combined spending' : `${dashboardFilter === 'person1' ? person1Name : person2Name}'s spending`}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('outflow')}
              className="text-xs font-semibold text-violet-600 hover:underline flex items-center gap-1"
            >
              All Outflows <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {metrics.topCategories.length === 0 ? (
            <div className="py-10 text-center text-stone-400 text-xs">
              <PieChart className="w-8 h-8 mx-auto text-stone-300 mb-2 stroke-1" />
              No spending recorded for this selection.
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {metrics.topCategories.map((cat) => {
                const percent =
                  metrics.categorySpendingPaise > 0
                    ? Math.round((cat.amount / metrics.categorySpendingPaise) * 100)
                    : 0;

                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-stone-700">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 tabular-nums">
                          {formatINR(cat.amount)}
                        </span>
                        <span className="text-stone-400 text-[11px] w-8 text-right tabular-nums">
                          {percent}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-violet-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Next Payments Due */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Upcoming Payments</h2>
                <p className="text-xs text-stone-500">Bills & loan EMIs</p>
              </div>
              <button
                onClick={() => setActiveTab('calendar')}
                className="text-xs font-semibold text-violet-600 hover:underline"
              >
                Calendar
              </button>
            </div>

            {nextPaymentsDue.length === 0 ? (
              <div className="py-8 text-center text-stone-400">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-medium text-stone-700">All obligations paid!</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {nextPaymentsDue.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-stone-900 truncate">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-400">
                        <span>Due {item.dueDate}</span>
                        {item.owner && (
                          <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 font-semibold text-[10px]">
                            {getOwnerLabel(item.owner as any, person1Name, person2Name)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-stone-900 tabular-nums">
                        {formatINR(item.amountDuePaise)}
                      </div>
                      <button
                        onClick={onOpenRecordPayment}
                        className="text-[11px] font-semibold text-violet-600 hover:underline mt-0.5 block"
                      >
                        Pay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4">
            <button
              onClick={onOpenRecordPayment}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-3.5 h-3.5 text-stone-600" />
              Record Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
