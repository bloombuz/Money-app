import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Account } from '../../types';
import { formatINR, parseINRToPaise } from '../../utils/finance';

interface ReconcileAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
}

export const ReconcileAccountModal: React.FC<ReconcileAccountModalProps> = ({
  isOpen,
  onClose,
  account,
}) => {
  const { getAccountBalance, reconcileAccount } = useFinance();

  const [actualBalanceStr, setActualBalanceStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatedBalancePaise = account ? getAccountBalance(account.id) : 0;

  React.useEffect(() => {
    if (account && isOpen) {
      const current = getAccountBalance(account.id);
      setActualBalanceStr((current / 100).toString());
      setError(null);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const actualPaise = parseINRToPaise(actualBalanceStr);
  const deltaPaise = actualPaise - calculatedBalancePaise;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await reconcileAccount(account.id, actualPaise);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to reconcile account');
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
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Reconcile {account.name}</h2>
              <p className="text-xs text-stone-500">Sync calculated balance with your actual bank app statement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Money Desk Balance */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/70">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Money Desk Calculated Balance
            </span>
            <div className="text-2xl font-bold text-stone-900 tabular-nums">
              {formatINR(calculatedBalancePaise)}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Computed from opening balance + inflows - outflows - transfers
            </p>
          </div>

          {/* Actual Balance in Bank App */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Actual Balance in Bank App (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium text-stone-400">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={actualBalanceStr}
                onChange={(e) => setActualBalanceStr(e.target.value)}
                className="w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-violet-500 tabular-nums"
                autoFocus
              />
            </div>
          </div>

          {/* Delta calculation indicator */}
          <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-100 flex items-center justify-between text-xs">
            <span className="text-stone-600">Reconciliation Adjustment:</span>
            <span className={`font-semibold tabular-nums ${deltaPaise >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {deltaPaise >= 0 ? '+' : ''}{formatINR(deltaPaise)}
            </span>
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
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSubmitting ? 'Syncing...' : 'Confirm Reconciliation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
