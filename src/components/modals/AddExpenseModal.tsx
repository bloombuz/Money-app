import React, { useState } from 'react';
import { X, ArrowUpRight, CreditCard as CardIcon, Wallet, User } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { OwnerType } from '../../types';
import { getKolkataDateString, parseINRToPaise, getOwnerLabel } from '../../utils/finance';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const {
    accounts,
    categories,
    creditCards,
    transactions,
    addTransaction,
    person1Name,
    person2Name,
  } = useFinance();

  const [amountStr, setAmountStr] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [owner, setOwner] = useState<OwnerType>('person1');
  const [paymentMode, setPaymentMode] = useState<'account' | 'credit_card'>('account');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [creditCardId, setCreditCardId] = useState(creditCards[0]?.id || '');
  const [txDate, setTxDate] = useState(getKolkataDateString());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggestions for merchants from outflow transactions
  const uniqueMerchants = Array.from(
    new Set(transactions.filter((t) => t.type === 'outflow').map((t) => t.sourceOrMerchant).filter(Boolean))
  ).slice(0, 5);

  const outflowCategories = categories.filter((c) => c.type === 'outflow');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amountPaise = parseINRToPaise(amountStr);
    if (amountPaise <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }
    if (!merchant.trim()) {
      setError('Please enter the merchant or payee name');
      return;
    }
    if (!txDate) {
      setError('Please select a transaction date');
      return;
    }

    if (paymentMode === 'credit_card' && creditCards.length === 0) {
      setError('No credit cards available. Please add a credit card first.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await addTransaction({
        type: 'outflow',
        amountPaise,
        transactionDate: txDate,
        sourceOrMerchant: merchant.trim(),
        category: categoryName.trim() || 'General Expense',
        accountId: paymentMode === 'account' ? accountId || (accounts[0]?.id ?? undefined) : undefined,
        creditCardId: paymentMode === 'credit_card' ? creditCardId || (creditCards[0]?.id ?? undefined) : undefined,
        owner,
        notes: notes.trim() || undefined,
        isDebtPayment: false,
      });

      setAmountStr('');
      setMerchant('');
      setCategoryName('');
      setNotes('');
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save expense');
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
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Add Expense</h2>
              <p className="text-xs text-stone-500">Record spending or card charge</p>
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
                placeholder="2,450"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-xl border border-stone-200 bg-stone-50/60 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-violet-500 tabular-nums"
                autoFocus
              />
            </div>
          </div>

          {/* Who paid? */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Who paid? *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOwner('person1')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  owner === 'person1'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {person1Name}
              </button>
              <button
                type="button"
                onClick={() => setOwner('person2')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  owner === 'person2'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {person2Name}
              </button>
            </div>
          </div>

          {/* Merchant / Payee */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Merchant / Payee *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Amazon, Blinkit, Swiggy, Landlord"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
            />
            {uniqueMerchants.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-stone-400">Recent:</span>
                {uniqueMerchants.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMerchant(m)}
                    className="text-xs px-2 py-0.5 rounded-md bg-stone-100 hover:bg-violet-50 hover:text-violet-700 text-stone-600 border border-stone-200 transition-colors"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Paid With: Account vs Credit Card */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Paid With *
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setPaymentMode('account')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  paymentMode === 'account'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Bank / Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('credit_card')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  paymentMode === 'credit_card'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <CardIcon className="w-3.5 h-3.5" />
                Credit Card
              </button>
            </div>

            {paymentMode === 'account' ? (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              >
                {accounts.length === 0 ? (
                  <option value="">Primary Account</option>
                ) : (
                  accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({getOwnerLabel(a.owner, person1Name, person2Name)})
                    </option>
                  ))
                )}
              </select>
            ) : (
              <div>
                {creditCards.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    No credit card added yet.
                  </p>
                ) : (
                  <select
                    value={creditCardId}
                    onChange={(e) => setCreditCardId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
                  >
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nickname} ({getOwnerLabel(c.owner, person1Name, person2Name)}) {c.lastFourDigits ? `•• ${c.lastFourDigits}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              >
                <option value="">Select category...</option>
                {outflowCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value="Groceries & Provisions">Groceries & Provisions</option>
                <option value="Dining & Cafes">Dining & Cafes</option>
                <option value="Shopping & Retail">Shopping & Retail</option>
                <option value="Utilities & Bills">Utilities & Bills</option>
                <option value="Rent & Housing">Rent & Housing</option>
                <option value="Transportation & Fuel">Transportation & Fuel</option>
                <option value="Healthcare & Medical">Healthcare & Medical</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Date *
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
              placeholder="Optional notes or receipt tag"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
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
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
