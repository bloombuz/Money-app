import React, { useMemo } from 'react';
import {
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Landmark,
  CreditCard,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatINR,
  formatMonthName,
  getKolkataDateString,
  getKolkataMonthString,
  getPreviousMonthString,
  getNextMonthString,
  formatDateKolkata,
} from '../../utils/finance';

interface PaymentCalendarViewProps {
  onRecordPayment: (target: {
    targetType: 'loan' | 'credit_card';
    targetId: string;
    installmentId?: string;
    statementId?: string;
  }) => void;
}

export const PaymentCalendarView: React.FC<PaymentCalendarViewProps> = ({
  onRecordPayment,
}) => {
  const {
    loans,
    installments,
    creditCards,
    statements,
    selectedMonth,
    setSelectedMonth,
    person1Name,
    person2Name,
  } = useFinance();

  const today = getKolkataDateString();
  const currentMonthStr = getKolkataMonthString();

  // 1. Overdue Carryover Section: any unpaid installments or statements from months BEFORE selectedMonth
  const overdueCarryovers = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      type: 'loan' | 'card';
      dueDate: string;
      month: string;
      scheduledAmountPaise: number;
      paidAmountPaise: number;
      remainingPaise: number;
      targetId: string;
      installmentId?: string;
      statementId?: string;
      owner?: string;
    }> = [];

    // Past loan installments
    installments.forEach((inst) => {
      if (inst.month < selectedMonth) {
        const remaining = Math.max(0, inst.scheduledAmountPaise - inst.paidAmountPaise);
        if (remaining > 0) {
          const loan = loans.find((l) => l.id === inst.loanId);
          list.push({
            id: inst.id,
            title: loan ? `${loan.lender} - ${loan.loanName}` : 'Loan EMI',
            type: 'loan',
            dueDate: inst.dueDate,
            month: inst.month,
            scheduledAmountPaise: inst.scheduledAmountPaise,
            paidAmountPaise: inst.paidAmountPaise,
            remainingPaise: remaining,
            targetId: inst.loanId,
            installmentId: inst.id,
            owner: loan?.owner,
          });
        }
      }
    });

    // Past card statements
    statements.forEach((stmt) => {
      if (stmt.statementMonth < selectedMonth) {
        const remaining = Math.max(0, stmt.totalAmountDuePaise - stmt.paidAmountPaise);
        if (remaining > 0) {
          const card = creditCards.find((c) => c.id === stmt.creditCardId);
          list.push({
            id: stmt.id,
            title: card ? `${card.nickname} (${card.issuer})` : 'Credit Card Statement',
            type: 'card',
            dueDate: stmt.dueDate,
            month: stmt.statementMonth,
            scheduledAmountPaise: stmt.totalAmountDuePaise,
            paidAmountPaise: stmt.paidAmountPaise,
            remainingPaise: remaining,
            targetId: stmt.creditCardId,
            statementId: stmt.id,
            owner: card?.owner,
          });
        }
      }
    });

    list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return list;
  }, [installments, statements, loans, creditCards, selectedMonth]);

  // 2. Scheduled Items for Selected Month
  const currentMonthBills = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      type: 'loan' | 'card';
      dueDate: string;
      scheduledAmountPaise: number;
      paidAmountPaise: number;
      remainingPaise: number;
      targetId: string;
      installmentId?: string;
      statementId?: string;
      status: string;
      owner?: string;
    }> = [];

    // Loan Installments for selectedMonth
    installments.forEach((inst) => {
      if (inst.month === selectedMonth) {
        const loan = loans.find((l) => l.id === inst.loanId);
        const remaining = Math.max(0, inst.scheduledAmountPaise - inst.paidAmountPaise);
        list.push({
          id: inst.id,
          title: loan ? `${loan.lender} • ${loan.loanName}` : 'Loan EMI',
          type: 'loan',
          dueDate: inst.dueDate,
          scheduledAmountPaise: inst.scheduledAmountPaise,
          paidAmountPaise: inst.paidAmountPaise,
          remainingPaise: remaining,
          targetId: inst.loanId,
          installmentId: inst.id,
          status: inst.status,
          owner: loan?.owner,
        });
      }
    });

    // Statements for selectedMonth
    statements.forEach((stmt) => {
      if (stmt.statementMonth === selectedMonth) {
        const card = creditCards.find((c) => c.id === stmt.creditCardId);
        const remaining = Math.max(0, stmt.totalAmountDuePaise - stmt.paidAmountPaise);
        list.push({
          id: stmt.id,
          title: card ? `${card.nickname} (${card.issuer})` : 'Credit Card Bill',
          type: 'card',
          dueDate: stmt.dueDate,
          scheduledAmountPaise: stmt.totalAmountDuePaise,
          paidAmountPaise: stmt.paidAmountPaise,
          remainingPaise: remaining,
          targetId: stmt.creditCardId,
          statementId: stmt.id,
          status: stmt.status,
          owner: card?.owner,
        });
      }
    });

    list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return list;
  }, [installments, statements, loans, creditCards, selectedMonth]);

  // Group current month bills by due date for agenda display
  const agendaByDate = useMemo(() => {
    const groups: Record<string, typeof currentMonthBills> = {};
    currentMonthBills.forEach((bill) => {
      if (!groups[bill.dueDate]) {
        groups[bill.dueDate] = [];
      }
      groups[bill.dueDate].push(bill);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [currentMonthBills]);

  // Aggregates for selected month
  const totalDuePaise = currentMonthBills.reduce((sum, b) => sum + b.scheduledAmountPaise, 0);
  const totalPaidPaise = currentMonthBills.reduce((sum, b) => sum + b.paidAmountPaise, 0);
  const totalRemainingPaise = currentMonthBills.reduce((sum, b) => sum + b.remainingPaise, 0);
  const overdueCount = currentMonthBills.filter(
    (b) => b.dueDate < today && b.remainingPaise > 0
  ).length + overdueCarryovers.length;

  const getStatusBadge = (dueDate: string, remaining: number, paid: number) => {
    if (remaining === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Paid
        </span>
      );
    }
    if (dueDate < today) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Overdue
        </span>
      );
    }
    if (dueDate === today) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          Due Today
        </span>
      );
    }
    if (paid > 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Partially Paid
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600">
        Upcoming
      </span>
    );
  };

  const getOwnerBadge = (owner?: string) => {
    if (owner === 'person1') {
      return (
        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-100">
          {person1Name}
        </span>
      );
    }
    if (owner === 'person2') {
      return (
        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
          {person2Name}
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        Unassigned
      </span>
    );
  };

  const getRelativeDayLabel = (dateStr: string) => {
    if (dateStr === today) return 'Today';
    const dDiff = Math.round((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
    if (dDiff === 1) return 'Tomorrow';
    if (dDiff > 1 && dDiff <= 7) return `In ${dDiff} days`;
    if (dDiff < 0) return `${Math.abs(dDiff)}d overdue`;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Payment Calendar</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Scheduled loan EMIs and credit card monthly statement bills
          </p>
        </div>

        {/* Month Navigation Control */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-white rounded-xl p-1 border border-stone-200 shadow-xs">
            <button
              onClick={() => setSelectedMonth(getPreviousMonthString(selectedMonth))}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-stone-800 whitespace-nowrap min-w-[90px] text-center">
              {formatMonthName(selectedMonth)}
            </span>
            <button
              onClick={() => setSelectedMonth(getNextMonthString(selectedMonth))}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors"
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

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            Total Due This Month
          </span>
          <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">
            {formatINR(totalDuePaise)}
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">{currentMonthBills.length} obligations</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
            Paid So Far
          </span>
          <div className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">
            {formatINR(totalPaidPaise)}
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">Cleared payments</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Remaining To Pay
          </span>
          <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">
            {formatINR(totalRemainingPaise)}
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">Pending bills</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">
            Overdue Count
          </span>
          <div className="text-xl font-bold text-rose-600 mt-1 tabular-nums">
            {overdueCount}
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            {overdueCount === 0 ? 'All up to date' : 'Action needed'}
          </p>
        </div>
      </div>

      {/* Overdue Carryover Banner (Clean & Urgent) */}
      {overdueCarryovers.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              Past Due Carryover ({overdueCarryovers.length} bills from earlier months)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {overdueCarryovers.map((carry) => (
              <div
                key={carry.id}
                className="p-3 rounded-xl bg-white border border-rose-100 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-900 truncate">
                      {carry.title}
                    </span>
                    {getOwnerBadge(carry.owner)}
                  </div>
                  <p className="text-[11px] text-rose-600 mt-0.5">
                    Due {formatDateKolkata(carry.dueDate)} • {formatINR(carry.remainingPaise)} remaining
                  </p>
                </div>

                <button
                  onClick={() =>
                    onRecordPayment({
                      targetType: carry.type === 'loan' ? 'loan' : 'credit_card',
                      targetId: carry.targetId,
                      installmentId: carry.installmentId,
                      statementId: carry.statementId,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-2xs shrink-0"
                >
                  Pay
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Payment Section: Responsive Desktop List & Mobile Agenda */}
      {currentMonthBills.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-800">No payments scheduled</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            No loan EMIs or credit card statements due for {formatMonthName(selectedMonth)}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Agenda View (Grouped by Due Date for Quick Scanning) */}
          <div className="block lg:hidden space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Payment Agenda
              </span>
              <span className="text-[11px] text-stone-400">
                Sorted by due date
              </span>
            </div>

            {agendaByDate.map(([date, bills]) => {
              const rel = getRelativeDayLabel(date);

              return (
                <div key={date} className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#FAF8F5] border-b border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-xs font-bold text-stone-800">
                        {formatDateKolkata(date)}
                      </span>
                    </div>
                    {rel && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        rel.includes('overdue')
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : rel === 'Today'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-violet-50 text-violet-700'
                      }`}>
                        {rel}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-stone-100">
                    {bills.map((bill) => (
                      <div key={bill.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-stone-900 truncate">
                              {bill.title}
                            </span>
                            {getOwnerBadge(bill.owner)}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(bill.dueDate, bill.remainingPaise, bill.paidAmountPaise)}
                            <span className="text-[11px] text-stone-500 tabular-nums">
                              Due: <strong>{formatINR(bill.remainingPaise)}</strong>
                            </span>
                          </div>
                        </div>

                        {bill.remainingPaise > 0 && (
                          <button
                            onClick={() =>
                              onRecordPayment({
                                targetType: bill.type === 'loan' ? 'loan' : 'credit_card',
                                targetId: bill.targetId,
                                installmentId: bill.installmentId,
                                statementId: bill.statementId,
                              })
                            }
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-xs shrink-0"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table / Cards Grid */}
          <div className="hidden lg:block bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-[#FAF8F5] border-b border-stone-100 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Scheduled Payments ({currentMonthBills.length})
              </span>
              <span className="text-xs text-stone-400">
                Sorted by due date
              </span>
            </div>

            <div className="divide-y divide-stone-100">
              {currentMonthBills.map((bill) => {
                const rel = getRelativeDayLabel(bill.dueDate);

                return (
                  <div
                    key={bill.id}
                    className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        bill.type === 'loan' ? 'bg-violet-50 text-violet-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {bill.type === 'loan' ? (
                          <Landmark className="w-4 h-4" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900 truncate">
                            {bill.title}
                          </span>
                          {getOwnerBadge(bill.owner)}
                          {getStatusBadge(bill.dueDate, bill.remainingPaise, bill.paidAmountPaise)}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1">
                          <span>
                            Due: <strong className="text-stone-700">{formatDateKolkata(bill.dueDate)}</strong>
                            {rel && <span className="text-stone-400 ml-1">({rel})</span>}
                          </span>
                          <span>•</span>
                          <span>Total: {formatINR(bill.scheduledAmountPaise)}</span>
                          {bill.paidAmountPaise > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-medium">
                                Paid: {formatINR(bill.paidAmountPaise)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 block uppercase font-medium">
                          Remaining
                        </span>
                        <span className="text-sm font-bold text-stone-900 tabular-nums">
                          {formatINR(bill.remainingPaise)}
                        </span>
                      </div>

                      {bill.remainingPaise > 0 && (
                        <button
                          onClick={() =>
                            onRecordPayment({
                              targetType: bill.type === 'loan' ? 'loan' : 'credit_card',
                              targetId: bill.targetId,
                              installmentId: bill.installmentId,
                              statementId: bill.statementId,
                            })
                          }
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          Record Payment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
