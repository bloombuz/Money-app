import React, { useState, useEffect } from 'react';
import { X, Building2, Wallet } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Account, OwnerType } from '../../types';
import { getKolkataDateString, parseINRToPaise } from '../../utils/finance';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit,
}) => {
  const { addAccount, editAccount, person1Name, person2Name } = useFinance();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [type, setType] = useState<'bank' | 'cash' | 'wallet'>('bank');
  const [accountNumberLast4, setAccountNumberLast4] = useState('');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('0');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(getKolkataDateString());
  const [owner, setOwner] = useState<OwnerType>('person1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (accountToEdit) {
      setName(accountToEdit.name);
      setNickname(accountToEdit.nickname || '');
      setType(accountToEdit.type || 'bank');
      setAccountNumberLast4(accountToEdit.accountNumberLast4 || '');
      setOpeningBalanceStr((accountToEdit.openingBalancePaise / 100).toString());
      setOpeningBalanceDate(accountToEdit.openingBalanceDate || getKolkataDateString());
      setOwner(accountToEdit.owner || 'unassigned');
    } else {
      setName('');
      setNickname('');
      setType('bank');
      setAccountNumberLast4('');
      setOpeningBalanceStr('0');
      setOpeningBalanceDate(getKolkataDateString());
      setOwner('person1');
    }
    setError(null);
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setError('Please provide an account name (e.g. HDFC Salary Account, Cash)');
      return;
    }

    const openingBalancePaise = parseINRToPaise(openingBalanceStr);

    try {
      setIsSubmitting(true);
      setError(null);

      if (accountToEdit) {
        await editAccount(accountToEdit.id, {
          name: name.trim(),
          nickname: nickname.trim() || undefined,
          type,
          accountNumberLast4: accountNumberLast4.trim() || undefined,
          openingBalancePaise,
          openingBalanceDate,
          owner,
        });
      } else {
        await addAccount({
          name: name.trim(),
          nickname: nickname.trim() || undefined,
          type,
          accountNumberLast4: accountNumberLast4.trim() || undefined,
          openingBalancePaise,
          openingBalanceDate,
          owner,
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save account');
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
              {type === 'bank' ? <Building2 className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                {accountToEdit ? 'Edit Account' : 'Add Bank or Cash Account'}
              </h2>
              <p className="text-xs text-stone-500">Track balance, owner, and opening figures</p>
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

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Account Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('bank')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  type === 'bank'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Bank Account
              </button>
              <button
                type="button"
                onClick={() => setType('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  type === 'cash'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Cash in Hand
              </button>
            </div>
          </div>

          {/* Owner Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Account Owner *
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

          {/* Account Name & Nickname */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Bank / Account Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC Salary Account"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Nickname (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Salary A/c"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
          </div>

          {/* Last 4 digits (if bank) */}
          {type === 'bank' && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Last 4 Digits of Account #
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="e.g. 4102"
                value={accountNumberLast4}
                onChange={(e) => setAccountNumberLast4(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-mono text-sm"
              />
            </div>
          )}

          {/* Opening Balance & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Opening Balance (₹)
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
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Opening Balance Date
              </label>
              <input
                type="date"
                value={openingBalanceDate}
                onChange={(e) => setOpeningBalanceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm"
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
              {isSubmitting ? 'Saving...' : accountToEdit ? 'Update Account' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
