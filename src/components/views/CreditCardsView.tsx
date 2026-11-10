import React, { useState } from 'react';
import {
  CreditCard as CardIcon,
  Plus,
  Receipt,
  FileText,
  Edit2,
  Trash2,
  Sliders,
  Info,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CreditCard, Payment } from '../../types';
import {
  formatINR,
  calculateCreditCardMetrics,
  getOwnerLabel,
} from '../../utils/finance';

interface CreditCardsViewProps {
  onOpenAddCard: () => void;
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (card: CreditCard) => void;
  onOpenAddStatement: (cardId?: string) => void;
  onRecordPaymentForCard: (cardId: string, statementId?: string) => void;
  onDeletePayment: (payment: Payment) => void;
}

export const CreditCardsView: React.FC<CreditCardsViewProps> = ({
  onOpenAddCard,
  onEditCard,
  onDeleteCard,
  onOpenAddStatement,
  onRecordPaymentForCard,
}) => {
  const {
    creditCards,
    statements,
    transactions,
    payments,
    editCreditCard,
    person1Name,
    person2Name,
  } = useFinance();

  const [adjustingCardId, setAdjustingCardId] = useState<string | null>(null);
  const [adjustmentValueStr, setAdjustmentValueStr] = useState('');

  // Calculate card metrics for each card
  const cardMetricsList = creditCards.map((card) => {
    const cardPurchases = transactions
      .filter((t) => t.type === 'outflow' && t.creditCardId === card.id)
      .reduce((sum, t) => sum + t.amountPaise, 0);

    const cardPayments = payments
      .filter((p) => p.targetType === 'credit_card' && p.targetId === card.id)
      .reduce((sum, p) => sum + p.amountPaise, 0);

    const cardStmtsRemaining = statements
      .filter((s) => s.creditCardId === card.id)
      .reduce((sum, s) => sum + Math.max(0, s.totalAmountDuePaise - s.paidAmountPaise), 0);

    const metrics = calculateCreditCardMetrics({
      openingBalancePaise: card.openingBalancePaise || 0,
      reconciliationAdjustmentPaise: card.reconciliationAdjustmentPaise || 0,
      purchasesPaise: cardPurchases,
      paymentsPaise: cardPayments,
      unpaidStatementsRemainingPaise: cardStmtsRemaining,
    });

    return {
      card,
      metrics,
      cardPurchases,
      cardPayments,
      cardStatements: statements.filter((s) => s.creditCardId === card.id),
    };
  });

  const totalOutstandingPaise = cardMetricsList.reduce(
    (sum, c) => sum + c.metrics.currentOutstandingPaise,
    0
  );
  const totalBilledStillDuePaise = cardMetricsList.reduce(
    (sum, c) => sum + c.metrics.billedAmountStillDuePaise,
    0
  );
  const totalUnbilledSpendingPaise = cardMetricsList.reduce(
    (sum, c) => sum + c.metrics.newUnbilledSpendingPaise,
    0
  );

  const handleSaveAdjustment = async (card: CreditCard) => {
    const paise = Math.round((parseFloat(adjustmentValueStr) || 0) * 100);
    await editCreditCard(card.id, {
      reconciliationAdjustmentPaise: paise,
    });
    setAdjustingCardId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - Minimalist Light */}
      <div className="bg-white text-stone-900 p-6 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Credit Cards Overview
          </span>
          <div className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight text-stone-900">
            {formatINR(totalOutstandingPaise)}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-stone-500">
            <span>Billed Still Due: <strong className="text-stone-800">{formatINR(totalBilledStillDuePaise)}</strong></span>
            <span>•</span>
            <span>Unbilled Spending: <strong className="text-stone-800">{formatINR(totalUnbilledSpendingPaise)}</strong></span>
            <span>•</span>
            <span>{creditCards.length} Active {creditCards.length === 1 ? 'Card' : 'Cards'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAddStatement()}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-stone-200"
          >
            <FileText className="w-3.5 h-3.5 text-stone-500" />
            Add Statement
          </button>
          <button
            onClick={onOpenAddCard}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        </div>
      </div>

      {/* Double Counting Guard Explanation Box */}
      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-600 leading-relaxed">
          <strong className="text-stone-800">Double-Counting Guard:</strong> Purchases are counted in category spending on the swipe date. Statements track what is billed and due. Paying your credit card bill logs a cash outflow and is excluded from category spending so expenses are never counted twice.
        </div>
      </div>

      {/* Cards List */}
      {creditCards.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-stone-200 text-center">
          <CardIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-stone-800">
            No Credit Cards Added
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Add your cards to track opening debt, monthly billing statements, due dates, and unbilled swipes.
          </p>
          <button
            onClick={onOpenAddCard}
            className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            + Add First Card
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {cardMetricsList.map(({ card, metrics, cardPurchases, cardPayments, cardStatements }) => (
            <div
              key={card.id}
              className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs"
            >
              {/* Card Header & Metrics */}
              <div className="p-5 border-b border-stone-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-stone-100 text-emerald-700 border border-stone-200 flex items-center justify-center font-bold">
                      <CardIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-stone-900">
                          {card.nickname}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-medium border border-stone-200">
                          {card.issuer}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-semibold border border-violet-100">
                          {getOwnerLabel(card.owner, person1Name, person2Name)}
                        </span>
                        {card.lastFourDigits && (
                          <span className="text-xs text-stone-400 font-mono">
                            •••• {card.lastFourDigits}
                          </span>
                        )}
                      </div>
                      {card.creditLimitPaise ? (
                        <p className="text-xs text-stone-500 mt-0.5">
                          Credit Limit: {formatINR(card.creditLimitPaise)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenAddStatement(card.id)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-xs font-medium text-stone-700 transition-colors flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-stone-500" />
                      Add Statement
                    </button>
                    <button
                      onClick={() => onRecordPaymentForCard(card.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Pay Card Bill
                    </button>
                    <button
                      onClick={() => onEditCard(card)}
                      aria-label="Edit card"
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCard(card)}
                      aria-label="Delete card"
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3 Metrics: Current Outstanding, Billed Still Due, New Unbilled Spending */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 p-4 rounded-lg bg-stone-50 border border-stone-200 text-xs">
                  <div>
                    <span className="text-stone-500 font-medium">1. Current Outstanding:</span>
                    <div className="text-lg font-bold text-stone-900 mt-0.5">
                      {formatINR(metrics.currentOutstandingPaise)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Opening: {formatINR(card.openingBalancePaise)} • Swipes: +{formatINR(cardPurchases)} • Paid: -{formatINR(cardPayments)}
                      {card.reconciliationAdjustmentPaise ? ` • Adj: ${formatINR(card.reconciliationAdjustmentPaise)}` : ''}
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-500 font-medium">2. Billed Amount Still Due:</span>
                    <div className="text-lg font-bold text-stone-900 mt-0.5">
                      {formatINR(metrics.billedAmountStillDuePaise)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Sum of remaining balances on unpaid statements
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-500 font-medium">3. New Unbilled Spending:</span>
                    <div className="text-lg font-bold text-stone-900 mt-0.5">
                      {formatINR(metrics.newUnbilledSpendingPaise)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Purchases not yet covered by an unpaid statement
                    </div>
                  </div>
                </div>

                {/* Reconciliation Adjustment Row */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  {adjustingCardId === card.id ? (
                    <div className="flex items-center gap-2 w-full max-w-sm">
                      <input
                        type="text"
                        placeholder="Adjustment in ₹"
                        value={adjustmentValueStr}
                        onChange={(e) => setAdjustmentValueStr(e.target.value)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-stone-300 bg-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveAdjustment(card)}
                        className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setAdjustingCardId(null)}
                        className="px-2 py-1 text-stone-500 hover:text-stone-700 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAdjustingCardId(card.id);
                        setAdjustmentValueStr(
                          card.reconciliationAdjustmentPaise
                            ? (card.reconciliationAdjustmentPaise / 100).toString()
                            : '0'
                        );
                      }}
                      className="text-stone-500 hover:text-emerald-700 text-[11px] flex items-center gap-1 font-medium"
                    >
                      <Sliders className="w-3 h-3" />
                      Reconcile adjustment (fees / credits / cashbacks)
                    </button>
                  )}
                </div>
              </div>

              {/* Statements List for this Card */}
              <div className="p-5 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Billing Statements ({cardStatements.length})
                </span>

                {cardStatements.length === 0 ? (
                  <p className="text-xs text-stone-400 py-2">
                    No statements entered yet. Click "Add Statement" above to track actual bill amounts and due dates.
                  </p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {cardStatements.map((stmt) => {
                      const totalRemaining = Math.max(0, stmt.totalAmountDuePaise - stmt.paidAmountPaise);
                      const minRemaining = Math.max(0, stmt.minimumAmountDuePaise - stmt.paidAmountPaise);

                      return (
                        <div
                          key={stmt.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-900">
                                Month: {stmt.statementMonth}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                                  stmt.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : stmt.status === 'partially_paid'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : stmt.status === 'overdue'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {stmt.status.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-stone-500">
                              <span>Statement Date: {stmt.statementDate}</span>
                              <span>•</span>
                              <span>Due Date: {stmt.dueDate}</span>
                              <span>•</span>
                              <span>Total Billed: {formatINR(stmt.totalAmountDuePaise)}</span>
                              <span>•</span>
                              <span>Paid: {formatINR(stmt.paidAmountPaise)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-stone-400">Balance Remaining</span>
                              <div className="text-sm font-semibold text-stone-900">
                                {formatINR(totalRemaining)}
                              </div>
                              <span className="text-[10px] text-stone-500">
                                Min Due: {formatINR(minRemaining)}
                              </span>
                            </div>

                            {stmt.status !== 'paid' && (
                              <button
                                onClick={() => onRecordPaymentForCard(card.id, stmt.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs"
                              >
                                Pay Statement
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
