import React, { useState, useEffect } from 'react';
import { X, TrendingUp, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Asset, OwnerType } from '../../types';
import { getKolkataDateString, parseINRToPaise } from '../../utils/finance';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit?: Asset | null;
}

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  assetToEdit,
}) => {
  const { addAsset, editAsset, person1Name, person2Name } = useFinance();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mutual Funds');
  const [valueStr, setValueStr] = useState('');
  const [asOfDate, setAsOfDate] = useState(getKolkataDateString());
  const [owner, setOwner] = useState<OwnerType>('person1');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (assetToEdit) {
      setName(assetToEdit.name);
      setCategory(assetToEdit.category || 'Mutual Funds');
      setValueStr((assetToEdit.valuePaise / 100).toString());
      setAsOfDate(assetToEdit.asOfDate || getKolkataDateString());
      setOwner(assetToEdit.owner || 'unassigned');
      setNotes(assetToEdit.notes || '');
    } else {
      setName('');
      setCategory('Mutual Funds');
      setValueStr('');
      setAsOfDate(getKolkataDateString());
      setOwner('person1');
      setNotes('');
    }
    setError(null);
  }, [assetToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setError('Please provide an asset name');
      return;
    }

    const valuePaise = parseINRToPaise(valueStr);
    if (valuePaise <= 0) {
      setError('Asset value must be greater than ₹0');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (assetToEdit) {
        await editAsset(assetToEdit.id, {
          name: name.trim(),
          category: category.trim(),
          valuePaise,
          asOfDate,
          owner,
          notes: notes.trim() || undefined,
        });
      } else {
        await addAsset({
          name: name.trim(),
          category: category.trim(),
          valuePaise,
          asOfDate,
          owner,
          notes: notes.trim() || undefined,
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save asset');
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
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                {assetToEdit ? 'Edit Asset' : 'Add Manual Asset'}
              </h2>
              <p className="text-xs text-stone-500">Add investments, gold, real estate, or retirement funds</p>
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

          {/* Value */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Current Market Value (₹ INR) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium text-stone-400">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="1,50,000"
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                className="w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-xl border border-stone-200 bg-stone-50/60 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-violet-500 tabular-nums"
                autoFocus
              />
            </div>
          </div>

          {/* Owner Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Asset Owner *
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

          {/* Asset Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Asset Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Parag Parikh Flexi Cap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              >
                <option value="Mutual Funds">Mutual Funds</option>
                <option value="Stocks & Equity">Stocks & Equity</option>
                <option value="Gold">Gold & Sovereign Bonds</option>
                <option value="Retirement & PF">Retirement / EPF / PPF</option>
                <option value="Fixed Deposit">Fixed Deposit (FD)</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Crypto">Crypto</option>
                <option value="Other">Other Asset</option>
              </select>
            </div>
          </div>

          {/* As Of Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Valuation Date *
              </label>
              <input
                type="date"
                required
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <input
                type="text"
                placeholder="Folio #, platform, notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
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
              {isSubmitting ? 'Saving...' : assetToEdit ? 'Update Asset' : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
