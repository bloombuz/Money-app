import React, { useState, useEffect } from 'react';
import { X, Landmark, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Loan, OwnerType } from '../../types';
import { getKolkataDateString, parseINRToPaise } from '../../utils/finance';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanToEdit?: Loan | null;
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

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose, loanToEdit }) => {
  const { addLoan, editLoan, person1Name, person2Name } = useFinance();

  const [lender, setLender] = useState('');
  const [loanName, setLoanName] = useState('');
  const [originalPrincipalStr, setOriginalPrincipalStr] = useState('');
  const [currentOutstandingStr, setCurrentOutstandingStr] = useState('');
  const [balanceDate, setBalanceDate] = useState(getKolkataDateString());
  const [emiAmountStr, setEmiAmountStr] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [remainingInstallmentsStr, setRemainingInstallmentsStr] = useState('');
  const [owner, setOwner] = useState<OwnerType>('person1');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (loanToEdit) {
      setLender(loanToEdit.lender);
      setLoanName(loanToEdit.loanName);
      setOriginalPrincipalStr((loanToEdit.originalPrincipalPaise / 100).toString());
      setCurrentOutstandingStr((loanToEdit.currentOutstandingPaise / 100).toString());
      setBalanceDate(loanToEdit.balanceAsOfDate || getKolkataDateString());
      setEmiAmountStr((loanToEdit.emiAmountPaise / 100).toString());
      setNextDueDate(loanToEdit.nextDueDate || '');
      setRemainingInstallmentsStr(loanToEdit.remainingInstallments.toString());
      setOwner(loanToEdit.owner || 'unassigned');
      setNotes(loanToEdit.notes || '');
    } else {
      setLender('');
      setLoanName('');
      setOriginalPrincipalStr('');
      setCurrentOutstandingStr('');
      setBalanceDate(getKolkataDateString());
      setEmiAmountStr('');
      setNextDueDate(getKolkataDateString());
      setRemainingInstallmentsStr('12');
      setOwner('person1');
      setNotes('');
    }
    setError(null);
  }, [loanToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!lender.trim()) {
      setError('Please enter lender name (e.g. SBI, HDFC, ICICI)');
      return;
    }
    if (!loanName.trim()) {
      setError('Please enter loan nickname (e.g. Home Loan, Car Loan)');
      return;
    }

    const originalPrincipalPaise = parseINRToPaise(originalPrincipalStr);
    const currentOutstandingPaise = parseINRToPaise(currentOutstandingStr);
    const emiAmountPaise = parseINRToPaise(emiAmountStr);
    const remainingInstallments = parseInt(remainingInstallmentsStr, 10);

    if (originalPrincipalPaise <= 0) {
      setError('Original principal must be greater than ₹0');
      return;
    }
    if (currentOutstandingPaise < 0) {
      setError('Outstanding balance cannot be negative');
      return;
    }
    if (emiAmountPaise <= 0) {
      setError('EMI amount must be greater than ₹0');
      return;
    }
    if (!nextDueDate) {
      setError('Please select the next payment due date');
      return;
    }
    if (isNaN(remainingInstallments) || remainingInstallments < 0) {
      setError('Remaining installments must be a valid number');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (loanToEdit) {
        await editLoan(loanToEdit.id, {
          lender: lender.trim(),
          loanName: loanName.trim(),
          originalPrincipalPaise,
          currentOutstandingPaise,
          balanceAsOfDate: balanceDate,
          emiAmountPaise,
          nextDueDate,
          remainingInstallments,
          owner,
          notes: notes.trim() || undefined,
        });
      } else {
        await addLoan({
          lender: lender.trim(),
          loanName: loanName.trim(),
          originalPrincipalPaise,
          currentOutstandingPaise,
          balanceAsOfDate: balanceDate,
          emiAmountPaise,
          nextDueDate,
          remainingInstallments,
          owner,
          notes: notes.trim() || undefined,
        });
      }

      onClose();
    } catch (err) {
      console.error('Error saving loan:', err);
      const rawMsg = err instanceof Error ? err.message : 'Failed to save loan';
      setError(cleanErrorMessage(rawMsg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200/80 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#FAF8F5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                {loanToEdit ? 'Edit Loan' : 'Add Loan'}
              </h2>
              <p className="text-xs text-stone-500">Record lender, EMI and terms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          {/* Owner Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Loan Owner *
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

          {/* Lender and Loan Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Lender / Bank *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SBI, HDFC Bank"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Loan Purpose / Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Home Loan, Auto Loan"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
          </div>

          {/* Principal & Current Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Original Principal (₹) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="10,00,000"
                value={originalPrincipalStr}
                onChange={(e) => setOriginalPrincipalStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Current Outstanding (₹) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="8,50,000"
                value={currentOutstandingStr}
                onChange={(e) => setCurrentOutstandingStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm tabular-nums"
              />
            </div>
          </div>

          {/* EMI Amount & Next Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Monthly EMI (₹) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="25,000"
                value={emiAmountStr}
                onChange={(e) => setEmiAmountStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Next Due Date *
              </label>
              <input
                type="date"
                required
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm"
              />
            </div>
          </div>

          {/* Remaining Installments & Balance As Of Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Remaining EMIs *
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="24"
                value={remainingInstallmentsStr}
                onChange={(e) => setRemainingInstallmentsStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Balance As Of Date
              </label>
              <input
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm"
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
              placeholder="e.g. 8.6% floating interest rate, fixed EMI"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm"
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
              {isSubmitting ? 'Saving...' : loanToEdit ? 'Update Loan' : 'Save Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
