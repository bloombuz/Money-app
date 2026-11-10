import React, { useState } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { evaluatePaymentStatus, getKolkataDateString, getKolkataMonthString, parseINRToPaise } from '../../utils/finance';

interface CardStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCardId?: string;
}

export const CardStatementModal: React.FC<CardStatementModalProps> = ({
  isOpen,
  onClose,
  initialCardId,
}) => {
  const { creditCards, addCardStatement } = useFinance();

  const [cardId, setCardId] = useState(initialCardId || creditCards[0]?.id || '');
  const [statementMonth, setStatementMonth] = useState(getKolkataMonthString());
  const [statementDate, setStatementDate] = useState(getKolkataDateString());
  const [dueDate, setDueDate] = useState('');
  const [totalDueStr, setTotalDueStr] = useState('');
  const [minDueStr, setMinDueStr] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialCardId) {
      setCardId(initialCardId);
    } else if (creditCards.length > 0 && !cardId) {
      setCardId(creditCards[0].id);
    }
  }, [initialCardId, creditCards]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!cardId) {
      setError('Please select a credit card');
      return;
    }

    const totalAmountDuePaise = parseINRToPaise(totalDueStr);
    const minimumAmountDuePaise = parseINRToPaise(minDueStr);

    if (totalAmountDuePaise <= 0) {
      setError('Total amount due must be greater than ₹0');
      return;
    }
    if (!dueDate) {
      setError('Please specify payment due date');
      return;
    }

    const today = getKolkataDateString();
    const status = evaluatePaymentStatus(totalAmountDuePaise, 0, dueDate, today);

    try {
      setIsSubmitting(true);
      setError(null);

      await addCardStatement({
        creditCardId: cardId,
        statementMonth,
        statementDate,
        dueDate,
        totalAmountDuePaise,
        minimumAmountDuePaise: minimumAmountDuePaise || Math.round(totalAmountDuePaise * 0.05), // Default to 5% min due if 0
        paidAmountPaise: 0,
        status,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to record statement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Add Card Statement
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Record actual billed statement total and due date
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Card Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
              Select Credit Card *
            </label>
            <select
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 text-sm"
            >
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nickname} ({c.issuer}) {c.lastFourDigits ? `•• ${c.lastFourDigits}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Statement Month & Statement Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Statement Month *
              </label>
              <input
                type="month"
                required
                value={statementMonth}
                onChange={(e) => setStatementMonth(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Statement Date *
              </label>
              <input
                type="date"
                required
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
          </div>

          {/* Total Due & Minimum Due */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Total Amount Due (₹) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="15,400.00"
                value={totalDueStr}
                onChange={(e) => setTotalDueStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Minimum Amount Due (₹)
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="1,500.00"
                value={minDueStr}
                onChange={(e) => setMinDueStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
              />
            </div>
          </div>

          {/* Payment Due Date */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
              Payment Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 text-sm font-medium"
            />
          </div>

          {/* Actions */}
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
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Recording...' : 'Save Statement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
