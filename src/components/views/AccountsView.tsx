import React, { useState } from 'react';
import {
  Building2,
  Wallet,
  Plus,
  ArrowRightLeft,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Account, OwnerType } from '../../types';
import {
  formatINR,
  getOwnerLabel,
  formatDateKolkata,
} from '../../utils/finance';
import { AccountModal } from '../modals/AccountModal';
import { TransferModal } from '../modals/TransferModal';
import { ReconcileAccountModal } from '../modals/ReconcileAccountModal';

export const AccountsView: React.FC = () => {
  const {
    accounts,
    deleteAccount,
    getAccountBalance,
    transactions,
    person1Name,
    person2Name,
  } = useFinance();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string | undefined>(undefined);
  const [accountToReconcile, setAccountToReconcile] = useState<Account | null>(null);

  // Totals
  const balances = accounts.map((a) => ({
    account: a,
    balance: getAccountBalance(a.id),
  }));

  const totalBankMoney = balances.reduce((sum, item) => sum + item.balance, 0);

  const person1Total = balances
    .filter((item) => item.account.owner === 'person1')
    .reduce((sum, item) => sum + item.balance, 0);

  const person2Total = balances
    .filter((item) => item.account.owner === 'person2')
    .reduce((sum, item) => sum + item.balance, 0);

  const unassignedTotal = balances
    .filter((item) => !item.account.owner || item.account.owner === 'unassigned')
    .reduce((sum, item) => sum + item.balance, 0);

  // Filter transfers
  const transferTxs = transactions
    .filter((t) => t.type === 'transfer')
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    .slice(0, 10);

  const getAccountName = (id?: string) => {
    if (!id) return 'Unknown';
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.nickname || acc.name : 'Unknown';
  };

  const getOwnerBadgeClass = (owner?: OwnerType) => {
    if (owner === 'person1') return 'bg-violet-100 text-violet-700 border-violet-200';
    if (owner === 'person2') return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Bank & Cash Accounts</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Holdings, transfers, and bank reconciliations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTransferFromId(undefined);
              setIsTransferOpen(true);
            }}
            disabled={accounts.length < 2}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-violet-600" />
            Transfer
          </button>
          <button
            onClick={() => {
              setAccountToEdit(null);
              setIsAddAccountOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Combined Total */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Combined Bank Money
            </span>
            <span className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-stone-900 tabular-nums">
            {formatINR(totalBankMoney)}
          </div>
          <div className="text-xs text-stone-400 mt-1">Across {accounts.length} accounts</div>
        </div>

        {/* Person 1 Total */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-700">
              {person1Name}'s Accounts
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
              Personal
            </span>
          </div>
          <div className="text-3xl font-bold text-stone-900 tabular-nums">
            {formatINR(person1Total)}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            {accounts.filter((a) => a.owner === 'person1').length} account(s)
          </div>
        </div>

        {/* Person 2 Total */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
              {person2Name}'s Accounts
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              Personal
            </span>
          </div>
          <div className="text-3xl font-bold text-stone-900 tabular-nums">
            {formatINR(person2Total)}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            {accounts.filter((a) => a.owner === 'person2').length} account(s)
          </div>
        </div>
      </div>

      {/* Unassigned Warning */}
      {unassignedTotal > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{formatINR(unassignedTotal)}</strong> in unassigned accounts. Assign owners so each person's net worth is accurate.
            </span>
          </div>
        </div>
      )}

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const currentBal = getAccountBalance(acc.id);
          return (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between hover:border-violet-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                      {acc.type === 'cash' ? <Wallet className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900 leading-tight">
                        {acc.name}
                      </h3>
                      <div className="text-xs text-stone-400">
                        {acc.nickname && <span className="font-medium text-stone-600">{acc.nickname} • </span>}
                        {acc.accountNumberLast4 ? `•• ${acc.accountNumberLast4}` : acc.type}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getOwnerBadgeClass(
                      acc.owner
                    )}`}
                  >
                    {getOwnerLabel(acc.owner, person1Name, person2Name)}
                  </span>
                </div>

                {/* Prominent Balance */}
                <div className="my-3">
                  <div className="text-2xl font-bold text-stone-900 tabular-nums">
                    {formatINR(currentBal)}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1.5">
                    <span>Opening: {formatINR(acc.openingBalancePaise)}</span>
                    {acc.openingBalanceDate && <span>({acc.openingBalanceDate})</span>}
                  </div>
                </div>

                {/* Reconciliation state */}
                {acc.lastReconciledDate && (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Reconciled on {acc.lastReconciledDate}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100 gap-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setAccountToReconcile(acc)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors flex items-center gap-1"
                    title="Reconcile with bank app"
                  >
                    <RefreshCw className="w-3 h-3 text-violet-600" />
                    Reconcile
                  </button>
                  <button
                    onClick={() => {
                      setTransferFromId(acc.id);
                      setIsTransferOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors flex items-center gap-1"
                    title="Transfer out of this account"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-violet-600" />
                    Transfer
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setAccountToEdit(acc);
                      setIsAddAccountOpen(true);
                    }}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                    title="Edit account"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete account "${acc.name}"? Transactions linked to it will remain.`)) {
                        await deleteAccount(acc.id);
                      }
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transfer History Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Recent Account Transfers</h2>
            <p className="text-xs text-stone-500">Transfers never inflate income or expense totals</p>
          </div>
          <span className="text-xs text-stone-400">{transferTxs.length} transfer(s)</span>
        </div>

        {transferTxs.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            No transfers recorded yet. Use the Transfer button to move money between accounts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-stone-500 font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">From</th>
                  <th className="py-2.5 px-3">To</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transferTxs.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 text-stone-600 font-mono">
                      {formatDateKolkata(t.transactionDate)}
                    </td>
                    <td className="py-3 px-3 font-medium text-stone-900">
                      {getAccountName(t.fromAccountId)}
                    </td>
                    <td className="py-3 px-3 font-medium text-stone-900">
                      {getAccountName(t.toAccountId)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900 tabular-nums">
                      {formatINR(t.amountPaise)}
                    </td>
                    <td className="py-3 px-3 text-stone-500">{t.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AccountModal
        isOpen={isAddAccountOpen}
        onClose={() => {
          setIsAddAccountOpen(false);
          setAccountToEdit(null);
        }}
        accountToEdit={accountToEdit}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          setTransferFromId(undefined);
        }}
        defaultFromAccountId={transferFromId}
      />

      <ReconcileAccountModal
        isOpen={!!accountToReconcile}
        onClose={() => setAccountToReconcile(null)}
        account={accountToReconcile}
      />
    </div>
  );
};
