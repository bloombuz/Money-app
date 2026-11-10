import React, { useState, useEffect } from 'react';
import { X, Receipt, Landmark, CreditCard, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, getKolkataDateString, parseINRToPaise } from '../../utils/finance';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTarget?: {
    targetType: 'loan' | 'credit_card';
    targetId: string;
    installmentId?: string;
    statementId?: string;
  };
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  initialTarget,
}) => {
  const {
    loans,
    installments,
    creditCards,
    statements,
    accounts,
    recordPayment,
  } = useFinance();

  const [targetType, setTargetType] = useState<'loan' | 'credit_card'>('loan');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState('');

  const [selectedCardId, setSelectedCardId] = useState('');
  const [selectedStatementId, setSelectedStatementId] = useState('');

  const [amountStr, setAmountStr] = useState('');
  const [paymentDate, setPaymentDate] = useState(getKolkataDateString());
  const [paidFromAccountId, setPaidFromAccountId] = useState(accounts[0]?.id || '');

  // Split details for loans
  const [isSplitKnown, setIsSplitKnown] = useState(false);
  const [principalStr, setPrincipalStr] = useState('');
  const [interestStr, setInterestStr] = useState('');
  const [feesStr, setFeesStr] = useState('');

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial target when opened
  useEffect(() => {
    if (initialTarget) {
      setTargetType(initialTarget.targetType);
      if (initialTarget.targetType === 'loan') {
        setSelectedLoanId(initialTarget.targetId);
        if (initialTarget.installmentId) {
          setSelectedInstallmentId(initialTarget.installmentId);
        }
      } else {
        setSelectedCardId(initialTarget.targetId);
        if (initialTarget.statementId) {
          setSelectedStatementId(initialTarget.statementId);
        }
      }
    } else {
      if (loans.length > 0 && !selectedLoanId) {
        setSelectedLoanId(loans[0].id);
      }
      if (creditCards.length > 0 && !selectedCardId) {
        setSelectedCardId(creditCards[0].id);
      }
    }
  }, [initialTarget, loans, creditCards]);

  // Autofill amount when selecting installment
  useEffect(() => {
    if (targetType === 'loan') {
      const loan = loans.find((l) => l.id === selectedLoanId);
      if (loan) {
        const inst = installments.find(
          (i) => i.loanId === loan.id && (selectedInstallmentId ? i.id === selectedInstallmentId : true)
        );
        if (inst) {
          const remaining = Math.max(0, inst.scheduledAmountPaise - inst.paidAmountPaise);
          setAmountStr((remaining / 100).toString());
          if (!selectedInstallmentId) {
            setSelectedInstallmentId(inst.id);
          }
        } else {
          setAmountStr((loan.emiAmountPaise / 100).toString());
        }
      }
    } else {
      const card = creditCards.find((c) => c.id === selectedCardId);
      if (card) {
        const stmt = statements.find(
          (s) => s.creditCardId === card.id && (selectedStatementId ? s.id === selectedStatementId : true)
        );
        if (stmt) {
          const remaining = Math.max(0, stmt.totalAmountDuePaise - stmt.paidAmountPaise);
          setAmountStr((remaining / 100).toString());
          if (!selectedStatementId) {
            setSelectedStatementId(stmt.id);
          }
        }
      }
    }
  }, [selectedLoanId, selectedInstallmentId, selectedCardId, selectedStatementId, targetType]);

  if (!isOpen) return null;

  const currentLoan = loans.find((l) => l.id === selectedLoanId);
  const currentCard = creditCards.find((c) => c.id === selectedCardId);
  const activeStatement = statements.find((s) => s.id === selectedStatementId);
  const activeInstallment = installments.find((i) => i.id === selectedInstallmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amountPaise = parseINRToPaise(amountStr);
    if (amountPaise <= 0) {
      setError('Please enter a valid payment amount greater than ₹0');
      return;
    }
    if (!paymentDate) {
      setError('Please select a payment date');
      return;
    }
    if (!paidFromAccountId && accounts.length > 0) {
      setPaidFromAccountId(accounts[0].id);
    }

    let principalPaise: number | undefined;
    let interestPaise: number | undefined;
    let feesPaise: number | undefined;

    if (targetType === 'loan' && isSplitKnown) {
      principalPaise = parseINRToPaise(principalStr);
      interestPaise = parseINRToPaise(interestStr);
      feesPaise = parseINRToPaise(feesStr);

      const splitTotal = (principalPaise || 0) + (interestPaise || 0) + (feesPaise || 0);
      if (splitTotal !== amountPaise) {
        setError(
          `Principal (${formatINR(principalPaise || 0)}) + Interest (${formatINR(interestPaise || 0)}) + Fees (${formatINR(feesPaise || 0)}) total ${formatINR(splitTotal)}, which does not match total payment ${formatINR(amountPaise)}`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (targetType === 'loan') {
        if (!selectedLoanId) {
          setError('Please select a loan');
          return;
        }
        await recordPayment({
          targetType: 'loan',
          targetId: selectedLoanId,
          installmentId: selectedInstallmentId || undefined,
          amountPaise,
          principalPaise,
          interestPaise,
          feesPaise,
          isSplitKnown,
          paidFromAccountId: paidFromAccountId || (accounts[0]?.id ?? 'default_acc'),
          paymentDate,
          notes: notes.trim() || undefined,
        });
      } else {
        if (!selectedCardId) {
          setError('Please select a credit card');
          return;
        }
        await recordPayment({
          targetType: 'credit_card',
          targetId: selectedCardId,
          statementId: selectedStatementId || undefined,
          amountPaise,
          isSplitKnown: false,
          paidFromAccountId: paidFromAccountId || (accounts[0]?.id ?? 'default_acc'),
          paymentDate,
          notes: notes.trim() || undefined,
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800 bg-indigo-50/50 dark:bg-indigo-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Record Payment</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Pay loan EMI or credit card bill</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTargetType('loan')}
              className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2.5 transition-all ${
                targetType === 'loan'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Landmark className="w-4 h-4" />
              Loan EMI Payment
            </button>
            <button
              type="button"
              onClick={() => setTargetType('credit_card')}
              className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2.5 transition-all ${
                targetType === 'credit_card'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Credit Card Bill
            </button>
          </div>

          {targetType === 'loan' ? (
            /* Loan Selection */
            <div className="space-y-3">
              {loans.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center">
                  <p className="text-xs text-stone-500">No active loans found. Please add a loan first.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                        Select Loan *
                      </label>
                      <select
                        value={selectedLoanId}
                        onChange={(e) => setSelectedLoanId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        {loans.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.lender} - {l.loanName} ({formatINR(l.currentOutstandingPaise)} balance)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                        Installment Due
                      </label>
                      <select
                        value={selectedInstallmentId}
                        onChange={(e) => setSelectedInstallmentId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Apply to general balance --</option>
                        {installments
                          .filter((i) => i.loanId === selectedLoanId)
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.month} (Due {i.dueDate}) - {formatINR(i.scheduledAmountPaise - i.paidAmountPaise)} remaining
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {currentLoan && (
                    <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-xs flex justify-between items-center">
                      <div>
                        <span className="text-stone-500">Current Outstanding:</span>{' '}
                        <strong className="text-stone-900 dark:text-stone-100 font-semibold">
                          {formatINR(currentLoan.currentOutstandingPaise)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-500">Scheduled EMI:</span>{' '}
                        <strong className="text-stone-900 dark:text-stone-100 font-semibold">
                          {formatINR(currentLoan.emiAmountPaise)}
                        </strong>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Credit Card Selection */
            <div className="space-y-3">
              {creditCards.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center">
                  <p className="text-xs text-stone-500">No credit cards found. Please add a card first.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                        Select Credit Card *
                      </label>
                      <select
                        value={selectedCardId}
                        onChange={(e) => setSelectedCardId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        {creditCards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nickname} ({c.issuer})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                        Select Statement
                      </label>
                      <select
                        value={selectedStatementId}
                        onChange={(e) => setSelectedStatementId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Unbilled / Direct Payment --</option>
                        {statements
                          .filter((s) => s.creditCardId === selectedCardId)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.statementMonth} (Due {s.dueDate}) - {formatINR(s.totalAmountDuePaise - s.paidAmountPaise)} remaining
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {activeStatement && (
                    <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-xs flex flex-wrap gap-3 justify-between items-center">
                      <div>
                        <span className="text-stone-500">Total Due:</span>{' '}
                        <strong className="text-stone-900 dark:text-stone-100">
                          {formatINR(activeStatement.totalAmountDuePaise - activeStatement.paidAmountPaise)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-500">Min Due:</span>{' '}
                        <strong className="text-amber-600 dark:text-amber-400">
                          {formatINR(activeStatement.minimumAmountDuePaise)}
                        </strong>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const rem = Math.max(0, activeStatement.totalAmountDuePaise - activeStatement.paidAmountPaise);
                            setAmountStr((rem / 100).toString());
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                        >
                          Pay Total
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAmountStr((activeStatement.minimumAmountDuePaise / 100).toString());
                          }}
                          className="px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium"
                        >
                          Pay Min
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Amount and Paid From */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Payment Amount (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-medium text-stone-400">
                  ₹
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 text-xl font-bold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Paid From Bank Account *
              </label>
              <select
                value={paidFromAccountId}
                onChange={(e) => setPaidFromAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loan Split Toggle & Fields */}
          {targetType === 'loan' && (
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSplitKnown}
                  onChange={(e) => setIsSplitKnown(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  I know the breakdown (Principal / Interest / Fees)
                </span>
              </label>

              {isSplitKnown ? (
                <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-700">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-500 mb-1">
                        Principal (₹)
                      </label>
                      <input
                        type="text"
                        placeholder="Principal"
                        value={principalStr}
                        onChange={(e) => setPrincipalStr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-stone-500 mb-1">
                        Interest (₹)
                      </label>
                      <input
                        type="text"
                        placeholder="Interest"
                        value={interestStr}
                        onChange={(e) => setInterestStr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-stone-500 mb-1">
                        Fees (₹)
                      </label>
                      <input
                        type="text"
                        placeholder="Fees"
                        value={feesStr}
                        onChange={(e) => setFeesStr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Loan outstanding balance will only be reduced by the principal component.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Split unknown? Your last confirmed loan principal will be preserved, and you can reconcile it later against your lender's latest statement.
                </p>
              )}
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="UTR, transaction reference, check #"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            <strong>Double-Counting Guard:</strong> This payment automatically creates one cash outflow from your bank account and is excluded from category spending so your budget remains exact.
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
