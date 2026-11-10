import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, getKolkataDateString, getOwnerLabel, parseINRToPaise } from '../../utils/finance';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFromAccountId?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  defaultFromAccountId,
}) => {
  const { accounts, getAccountBalance, recordTransfer, person1Name, person2Name } = useFinance();

  const [fromAccountId, setFromAccountId] = useState(defaultFromAccountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(
    accounts.find((a) => a.id !== (defaultFromAccountId || accounts[0]?.id))?.id || ''
  );
  const [amountStr, setAmountStr] = useState('');
  const [transferDate, setTransferDate] = useState(getKolkataDateString());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const from = defaultFromAccountId || accounts[0]?.id || '';
      setFromAccountId(from);
      const to = accounts.find((a) => a.id !== from)?.id || '';
      setToAccountId(to);
      setAmountStr('');
      setTransferDate(getKolkataDateString());
      setNotes('');
      setError(null);
    }
  }, [isOpen, defaultFromAccountId, accounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!fromAccountId || !toAccountId) {
      setError('Please select both From and To accounts');
      return;
    }
    if (fromAccountId === toAccountId) {
      setError('Source and Destination accounts must be different');
      return;
    }

    const amountPaise = parseINRToPaise(amountStr);
    if (amountPaise <= 0) {
      setError('Please enter an amount greater than ₹0');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await recordTransfer({
        fromAccountId,
        toAccountId,
        amountPaise,
        transferDate,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to record transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromBal = fromAccountId ? getAccountBalance(fromAccountId) : 0;
  const toBal = toAccountId ? getAccountBalance(toAccountId) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Transfer Money</h2>
              <p className="text-xs text-stone-500">Move funds between accounts without altering income/spending</p>
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
              Transfer Amount (₹ INR) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium text-stone-400">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="10,000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-xl border border-stone-200 bg-stone-50/60 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-violet-500 tabular-nums"
                autoFocus
              />
            </div>
          </div>

          {/* Accounts grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* From Account */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                From Account *
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-violet-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({getOwnerLabel(a.owner, person1Name, person2Name)})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                Balance: <span className="font-semibold text-stone-800">{formatINR(fromBal)}</span>
              </p>
            </div>

            {/* To Account */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                To Account *
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-violet-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                    {a.name} ({getOwnerLabel(a.owner, person1Name, person2Name)})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                Balance: <span className="font-semibold text-stone-800">{formatINR(toBal)}</span>
              </p>
            </div>
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Transfer Date *
              </label>
              <input
                type="date"
                required
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <input
                type="text"
                placeholder="Reason or reference"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-violet-500"
              />
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
              {isSubmitting ? 'Transferring...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
