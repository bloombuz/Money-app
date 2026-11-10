import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  Receipt,
  Edit2,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Loan, Payment } from '../../types';
import {
  formatINR,
  formatMonthName,
  getPreviousMonthString,
  getNextMonthString,
  getOwnerLabel,
} from '../../utils/finance';

interface LoansViewProps {
  onOpenAddLoan: () => void;
  onEditLoan: (loan: Loan) => void;
  onDeleteLoan: (loan: Loan) => void;
  onRecordPaymentForLoan: (loanId: string, installmentId?: string) => void;
  onDeletePayment: (payment: Payment) => void;
}

export const LoansView: React.FC<LoansViewProps> = ({
  onOpenAddLoan,
  onEditLoan,
  onDeleteLoan,
  onRecordPaymentForLoan,
  onDeletePayment,
}) => {
  const {
    loans,
    installments,
    payments,
    selectedMonth,
    setSelectedMonth,
    person1Name,
    person2Name,
  } = useFinance();

  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Totals across all active loans
  const totalOutstandingPaise = loans.reduce((sum, l) => sum + (l.currentOutstandingPaise || 0), 0);
  const totalMonthlyEmiPaise = loans.reduce((sum, l) => sum + (l.emiAmountPaise || 0), 0);

  // Installments for the selected month
  const currentMonthInstallments = installments.filter((i) => i.month === selectedMonth);

  return (
    <div className="space-y-6">
      {/* Top Banner - Minimalist Light */}
      <div className="bg-white text-stone-900 p-6 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total Loan Debt Overview
          </span>
          <div className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight text-stone-900">
            {formatINR(totalOutstandingPaise)}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Total scheduled EMIs: <strong className="text-stone-800">{formatINR(totalMonthlyEmiPaise)}/month</strong> across {loans.length} active {loans.length === 1 ? 'loan' : 'loans'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddLoan}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Loan
          </button>
        </div>
      </div>

      {/* Month Installment Schedule Bar */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              Scheduled EMIs for {formatMonthName(selectedMonth)}
            </h2>
            <p className="text-xs text-stone-500">
              Monthly installment status, amounts paid, and remaining due
            </p>
          </div>

          <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
            <button
              onClick={() => setSelectedMonth(getPreviousMonthString(selectedMonth))}
              className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-white rounded-md transition-colors"
            >
              Prev
            </button>
            <span className="px-3 text-xs font-semibold text-stone-900">
              {formatMonthName(selectedMonth)}
            </span>
            <button
              onClick={() => setSelectedMonth(getNextMonthString(selectedMonth))}
              className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-white rounded-md transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {currentMonthInstallments.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400 bg-stone-50 rounded-lg border border-dashed border-stone-200">
            No specific installments scheduled for {formatMonthName(selectedMonth)}. You can record an EMI payment directly or edit your loan to adjust due dates.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {currentMonthInstallments.map((inst) => {
              const loan = loans.find((l) => l.id === inst.loanId);
              const remaining = Math.max(0, inst.scheduledAmountPaise - inst.paidAmountPaise);

              return (
                <div
                  key={inst.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-900">
                        {loan ? `${loan.lender} - ${loan.loanName}` : 'Loan'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                          inst.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : inst.status === 'partially_paid'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : inst.status === 'overdue'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {inst.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                      <span>Due: {inst.dueDate}</span>
                      <span>•</span>
                      <span>Scheduled: {formatINR(inst.scheduledAmountPaise)}</span>
                      <span>•</span>
                      <span>Paid: {formatINR(inst.paidAmountPaise)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400">Remaining Due</span>
                      <div className="text-sm font-semibold text-stone-900">
                        {formatINR(remaining)}
                      </div>
                    </div>

                    {inst.status !== 'paid' && (
                      <button
                        onClick={() => onRecordPaymentForLoan(inst.loanId, inst.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Pay EMI
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Loans List */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          All Active Loans ({loans.length})
        </h3>

        {loans.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-stone-200 text-center">
            <Landmark className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-stone-800">
              No Loans Tracked
            </h4>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Add home loans, personal loans, or vehicle loans to track principal balance, schedule EMIs, and log payments.
            </p>
            <button
              onClick={onOpenAddLoan}
              className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              + Add First Loan
            </button>
          </div>
        ) : (
          loans.map((loan) => {
            const loanPayments = payments.filter((p) => p.targetType === 'loan' && p.targetId === loan.id);
            const isExpanded = expandedLoanId === loan.id;

            return (
              <div
                key={loan.id}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs"
              >
                {/* Loan Card Main */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold text-stone-900">
                        {loan.lender}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium border border-stone-200">
                        {loan.loanName}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-semibold border border-violet-100">
                        {getOwnerLabel(loan.owner, person1Name, person2Name)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
                      <div>
                        <span className="text-stone-500">Current Outstanding:</span>
                        <div className="text-base font-bold text-stone-900">
                          {formatINR(loan.currentOutstandingPaise)}
                        </div>
                        <span className="text-[10px] text-stone-400">as of {loan.balanceAsOfDate}</span>
                      </div>

                      <div>
                        <span className="text-stone-500">Scheduled EMI:</span>
                        <div className="text-sm font-semibold text-stone-800">
                          {formatINR(loan.emiAmountPaise)}
                        </div>
                        <span className="text-[10px] text-stone-400">Next: {loan.nextDueDate}</span>
                      </div>

                      <div>
                        <span className="text-stone-500">Original Principal:</span>
                        <div className="text-sm font-medium text-stone-700">
                          {formatINR(loan.originalPrincipalPaise)}
                        </div>
                      </div>

                      <div>
                        <span className="text-stone-500">Remaining EMIs:</span>
                        <div className="text-sm font-medium text-stone-700">
                          {loan.remainingInstallments} installments
                        </div>
                      </div>
                    </div>

                    {loan.notes && (
                      <p className="text-xs text-stone-500 mt-2 italic">
                        Note: {loan.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                    <button
                      onClick={() => onRecordPaymentForLoan(loan.id)}
                      className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Record Payment
                    </button>

                    <button
                      onClick={() => onEditLoan(loan)}
                      aria-label="Edit loan"
                      className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteLoan(loan)}
                      aria-label="Delete loan"
                      className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                      aria-label="Toggle loan payment history"
                      className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Payment History & Split Records */}
                {isExpanded && (
                  <div className="px-5 py-4 bg-stone-50 border-t border-stone-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Payment & Principal Reduction History ({loanPayments.length})
                      </span>
                      <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Principal portion reduces outstanding balance
                      </span>
                    </div>

                    {loanPayments.length === 0 ? (
                      <p className="text-xs text-stone-400 py-2">
                        No payments recorded yet for this loan.
                      </p>
                    ) : (
                      <div className="divide-y divide-stone-200 bg-white rounded-lg border border-stone-200 overflow-hidden text-xs">
                        {loanPayments.map((p) => (
                          <div
                            key={p.id}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50/50"
                          >
                            <div>
                              <div className="font-semibold text-stone-800">
                                Date: {p.paymentDate} • Total: {formatINR(p.amountPaise)}
                              </div>
                              <div className="text-[11px] text-stone-500 mt-0.5">
                                {p.isSplitKnown ? (
                                  <span>
                                    Principal: <strong className="text-emerald-700">{formatINR(p.principalPaise || 0)}</strong> •
                                    Interest: {formatINR(p.interestPaise || 0)} •
                                    Fees: {formatINR(p.feesPaise || 0)}
                                  </span>
                                ) : (
                                  <span className="italic text-stone-400">
                                    Split unknown (Principal preserved)
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => onDeletePayment(p)}
                              className="text-xs text-red-600 hover:underline px-2 py-1 rounded hover:bg-red-50 font-medium"
                            >
                              Delete & Reverse
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
