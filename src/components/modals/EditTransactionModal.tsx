import React, { useState } from 'react';
import { X, Clock, Edit3, User, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { OwnerType, Transaction } from '../../types';
import { formatDateTimeKolkata, parseINRToPaise } from '../../utils/finance';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { editTransaction, accounts, person1Name, person2Name } = useFinance();

  const [amountStr, setAmountStr] = useState('');
  const [sourceOrMerchant, setSourceOrMerchant] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [txDate, setTxDate] = useState('');
  const [owner, setOwner] = useState<OwnerType>('person1');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (transaction) {
      setAmountStr((transaction.amountPaise / 100).toString());
      setSourceOrMerchant(transaction.sourceOrMerchant || '');
      setCategoryName(transaction.category || '');
      setTxDate(transaction.transactionDate || '');
      setOwner(transaction.owner || 'unassigned');
      setAccountId(transaction.accountId || '');
      setNotes(transaction.notes || '');
      setError(null);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amountPaise = parseINRToPaise(amountStr);
    if (amountPaise <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }
    if (!sourceOrMerchant.trim()) {
      setError('Please enter a source or merchant name');
      return;
    }
    if (!txDate) {
      setError('Please select a transaction date');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await editTransaction(transaction.id, {
        amountPaise,
        sourceOrMerchant: sourceOrMerchant.trim(),
        category: categoryName.trim() || 'General',
        transactionDate: txDate,
        owner,
        accountId: accountId || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Edit {transaction.type === 'inflow' ? 'Income' : transaction.type === 'transfer' ? 'Transfer' : 'Expense'}
              </h2>
              <p className="text-xs text-stone-500">Update record details and assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Amount (₹ INR) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium text-stone-400">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-xl border border-stone-200 bg-stone-50/60 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-violet-500 tabular-nums"
              />
            </div>
          </div>

          {/* Owner Assignment */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              {transaction.type === 'inflow' ? 'Who received it?' : 'Who paid?'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOwner('person1')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  owner === 'person1'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                {person1Name}
              </button>
              <button
                type="button"
                onClick={() => setOwner('person2')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  owner === 'person2'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                {person2Name}
              </button>
              <button
                type="button"
                onClick={() => setOwner('unassigned')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  owner === 'unassigned'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                Unassigned
              </button>
            </div>
          </div>

          {/* Source / Merchant */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              {transaction.type === 'inflow' ? 'Income Source / Payer' : 'Merchant / Payee'} *
            </label>
            <input
              type="text"
              required
              value={sourceOrMerchant}
              onChange={(e) => setSourceOrMerchant(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Immutable Timestamp Banner */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="text-stone-500">Created:</span>{' '}
              <strong className="text-stone-700 font-mono font-medium">
                {formatDateTimeKolkata(transaction.addedOn)}
              </strong>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
