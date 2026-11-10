import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CreditCard as ICreditCard, OwnerType } from '../../types';
import { parseINRToPaise } from '../../utils/finance';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit?: ICreditCard | null;
}

function cleanErrorMessage(raw: string): string {
  try {
    if (raw.startsWith('{') && raw.includes('"error"')) {
      const parsed = JSON.parse(raw);
      return parsed.error || parsed.message || raw;
    }
  } catch {
    // fallback
  }
  return raw;
}

export const CreditCardModal: React.FC<CreditCardModalProps> = ({
  isOpen,
  onClose,
  cardToEdit,
}) => {
  const { addCreditCard, editCreditCard, person1Name, person2Name } = useFinance();

  const [nickname, setNickname] = useState('');
  const [issuer, setIssuer] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [limitStr, setLimitStr] = useState('');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('');
  const [adjustmentStr, setAdjustmentStr] = useState('0');
  const [owner, setOwner] = useState<OwnerType>('person1');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (cardToEdit) {
      setNickname(cardToEdit.nickname);
      setIssuer(cardToEdit.issuer);
      setLastFour(cardToEdit.lastFourDigits || '');
      setLimitStr(cardToEdit.creditLimitPaise ? (cardToEdit.creditLimitPaise / 100).toString() : '');
      setOpeningBalanceStr((cardToEdit.openingBalancePaise / 100).toString());
      setAdjustmentStr(
        cardToEdit.reconciliationAdjustmentPaise
          ? (cardToEdit.reconciliationAdjustmentPaise / 100).toString()
          : '0'
      );
      setOwner(cardToEdit.owner || 'unassigned');
    } else {
      setNickname('');
      setIssuer('');
      setLastFour('');
      setLimitStr('');
      setOpeningBalanceStr('0');
      setAdjustmentStr('0');
      setOwner('person1');
    }
    setError(null);
  }, [cardToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!nickname.trim()) {
      setError('Please provide a card nickname');
      return;
    }
    if (!issuer.trim()) {
      setError('Please specify the card issuer (e.g. HDFC, ICICI, SBI, Axis)');
      return;
    }

    const openingBalancePaise = parseINRToPaise(openingBalanceStr);
    const creditLimitPaise = limitStr ? parseINRToPaise(limitStr) : undefined;
    const reconciliationAdjustmentPaise = parseINRToPaise(adjustmentStr);

    try {
      setIsSubmitting(true);
      setError(null);

      if (cardToEdit) {
        await editCreditCard(cardToEdit.id, {
          nickname: nickname.trim(),
          issuer: issuer.trim(),
          lastFourDigits: lastFour.trim() || undefined,
          creditLimitPaise,
          openingBalancePaise,
          reconciliationAdjustmentPaise,
          owner,
        });
      } else {
        await addCreditCard({
          nickname: nickname.trim(),
          issuer: issuer.trim(),
          lastFourDigits: lastFour.trim() || undefined,
          creditLimitPaise,
          openingBalancePaise,
          reconciliationAdjustmentPaise,
          owner,
        });
      }

      onClose();
    } catch (err) {
      console.error('Error saving credit card:', err);
      const rawMsg = err instanceof Error ? err.message : 'Failed to save credit card';
      setError(cleanErrorMessage(rawMsg));
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
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                {cardToEdit ? 'Edit Credit Card' : 'Add Credit Card'}
              </h2>
              <p className="text-xs text-stone-500">Record card limits and balances</p>
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
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          {/* Owner Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Card Owner *
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

          {/* Nickname & Issuer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Card Nickname *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Amazon Pay ICICI"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Card Issuer / Bank *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC Bank, ICICI"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
          </div>

          {/* Last 4 digits & Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Last 4 Digits
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="e.g. 7890"
                value={lastFour}
                onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Credit Limit (₹)
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 2,00,000"
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm"
              />
            </div>
          </div>

          {/* Opening Balance */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Opening Outstanding Balance (₹)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={openingBalanceStr}
              onChange={(e) => setOpeningBalanceStr(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm tabular-nums"
            />
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
              {isSubmitting ? 'Saving...' : cardToEdit ? 'Update Card' : 'Save Credit Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
