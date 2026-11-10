import React, { useState } from 'react';
import {
  FinanceProvider,
  useFinance,
} from './context/FinanceContext';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { AccountsView } from './components/views/AccountsView';
import { InflowView } from './components/views/InflowView';
import { OutflowView } from './components/views/OutflowView';
import { LoansView } from './components/views/LoansView';
import { CreditCardsView } from './components/views/CreditCardsView';
import { PaymentCalendarView } from './components/views/PaymentCalendarView';
import { SettingsView } from './components/views/SettingsView';

import { AddIncomeModal } from './components/modals/AddIncomeModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { EditTransactionModal } from './components/modals/EditTransactionModal';
import { LoanModal } from './components/modals/LoanModal';
import { CreditCardModal } from './components/modals/CreditCardModal';
import { CardStatementModal } from './components/modals/CardStatementModal';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';
import { AcceptInviteModal } from './components/modals/AcceptInviteModal';

import { Transaction, Loan, CreditCard, Payment } from './types';
import {
  IndianRupee,
  LogIn,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';

function AppContent() {
  const {
    user,
    loadingAuth,
    signIn,
    continueAsDemo,
    activeTab,
    deleteTransaction,
    deleteLoan,
    deleteCreditCard,
    deletePayment,
    clearWorkspace,
    actionSuccess,
    lastError,
    clearError,
    pendingInviteToAccept,
    setPendingInviteToAccept,
  } = useFinance();

  // Modal open states
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentInitialTarget, setPaymentInitialTarget] = useState<
    | {
        targetType: 'loan' | 'credit_card';
        targetId: string;
        installmentId?: string;
        statementId?: string;
      }
    | undefined
  >(undefined);

  const [editTxModalOpen, setEditTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<CreditCard | null>(null);

  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [statementCardId, setStatementCardId] = useState<string | undefined>(undefined);

  // Generic delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Handlers
  const handleEditTransaction = (tx: Transaction) => {
    setTxToEdit(tx);
    setEditTxModalOpen(true);
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    setDeleteConfig({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this ${tx.type} record "${tx.sourceOrMerchant}"?`,
      onConfirm: () => deleteTransaction(tx.id),
    });
    setDeleteModalOpen(true);
  };

  const handleEditLoan = (loan: Loan) => {
    setLoanToEdit(loan);
    setLoanModalOpen(true);
  };

  const handleDeleteLoan = (loan: Loan) => {
    setDeleteConfig({
      title: 'Delete Loan',
      message: `Are you sure you want to remove "${loan.lender} - ${loan.loanName}" and its scheduled installments?`,
      onConfirm: () => deleteLoan(loan.id),
    });
    setDeleteModalOpen(true);
  };

  const handleEditCard = (card: CreditCard) => {
    setCardToEdit(card);
    setCardModalOpen(true);
  };

  const handleDeleteCard = (card: CreditCard) => {
    setDeleteConfig({
      title: 'Delete Credit Card',
      message: `Are you sure you want to delete "${card.nickname}" and all its statements?`,
      onConfirm: () => deleteCreditCard(card.id),
    });
    setDeleteModalOpen(true);
  };

  const handleDeletePayment = (payment: Payment) => {
    setDeleteConfig({
      title: 'Delete Payment',
      message: `Are you sure you want to delete this payment? This will reverse the installment status and restore balances.`,
      onConfirm: () => deletePayment(payment.id),
    });
    setDeleteModalOpen(true);
  };

  const handleConfirmClearWorkspace = () => {
    setDeleteConfig({
      title: 'Reset Workspace to Empty',
      message: 'Are you sure you want to delete ALL accounts, categories, loans, cards, assets, and transactions? This cannot be undone.',
      onConfirm: () => clearWorkspace(),
    });
    setDeleteModalOpen(true);
  };

  const handleOpenRecordPaymentForTarget = (target: {
    targetType: 'loan' | 'credit_card';
    targetId: string;
    installmentId?: string;
    statementId?: string;
  }) => {
    setPaymentInitialTarget(target);
    setRecordPaymentOpen(true);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-lg animate-pulse shadow-xs">
            <IndianRupee className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-stone-500 tracking-wider uppercase animate-pulse">
            Loading Money Desk...
          </p>
        </div>
      </div>
    );
  }

  // Signed out view - Warm Ivory & Soft Lilac Theme
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center p-6 text-stone-900">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-stone-200/80 shadow-md text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold mx-auto shadow-xs">
            <IndianRupee className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Money Desk</h1>
            <p className="text-xs text-stone-500 mt-1">
              Personal & Shared Finance CRM
            </p>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed bg-[#FAF8F5] p-4 rounded-xl border border-stone-200/80 text-left">
            Track daily income, spending, and bank balances individually and together. See each person's exact net worth, manage transfers without inflating expenses, and keep debt under control with zero float drift.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={signIn}
              className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google
            </button>
            <button
              onClick={continueAsDemo}
              className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-stone-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              Explore Demo Workspace
            </button>
            <p className="text-[11px] text-stone-400">
              Cloud Firestore permanently stores your private records under your Google account.
            </p>
          </div>
        </div>

        <AcceptInviteModal
          isOpen={!!pendingInviteToAccept}
          onClose={() => setPendingInviteToAccept(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex">
      {/* Navigation */}
      <Sidebar
        onOpenAddIncome={() => setAddIncomeOpen(true)}
        onOpenAddExpense={() => setAddExpenseOpen(true)}
        onOpenRecordPayment={() => {
          setPaymentInitialTarget(undefined);
          setRecordPaymentOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 pt-16 lg:pt-0 min-h-screen flex flex-col">
        {/* Success Toast */}
        {actionSuccess && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-md animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Error Toast */}
        {lastError && (
          <div className="fixed top-4 right-4 z-50 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-medium shadow-md animate-in fade-in max-w-md border border-stone-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{lastError}</span>
            </div>
            <button onClick={clearError} className="p-1 hover:bg-stone-800 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex-1">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenAddIncome={() => setAddIncomeOpen(true)}
              onOpenAddExpense={() => setAddExpenseOpen(true)}
              onOpenRecordPayment={() => {
                setPaymentInitialTarget(undefined);
                setRecordPaymentOpen(true);
              }}
              onOpenAddCard={() => {
                setCardToEdit(null);
                setCardModalOpen(true);
              }}
              onOpenAddLoan={() => {
                setLoanToEdit(null);
                setLoanModalOpen(true);
              }}
            />
          )}

          {activeTab === 'accounts' && <AccountsView />}

          {activeTab === 'inflow' && (
            <InflowView
              onOpenAddIncome={() => setAddIncomeOpen(true)}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'outflow' && (
            <OutflowView
              onOpenAddExpense={() => setAddExpenseOpen(true)}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'loans' && (
            <LoansView
              onOpenAddLoan={() => {
                setLoanToEdit(null);
                setLoanModalOpen(true);
              }}
              onEditLoan={handleEditLoan}
              onDeleteLoan={handleDeleteLoan}
              onRecordPaymentForLoan={(loanId, instId) =>
                handleOpenRecordPaymentForTarget({
                  targetType: 'loan',
                  targetId: loanId,
                  installmentId: instId,
                })
              }
              onDeletePayment={handleDeletePayment}
            />
          )}

          {activeTab === 'credit_cards' && (
            <CreditCardsView
              onOpenAddCard={() => {
                setCardToEdit(null);
                setCardModalOpen(true);
              }}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              onOpenAddStatement={(cardId) => {
                setStatementCardId(cardId);
                setStatementModalOpen(true);
              }}
              onRecordPaymentForCard={(cardId, stmtId) =>
                handleOpenRecordPaymentForTarget({
                  targetType: 'credit_card',
                  targetId: cardId,
                  statementId: stmtId,
                })
              }
              onDeletePayment={handleDeletePayment}
            />
          )}

          {activeTab === 'calendar' && (
            <PaymentCalendarView
              onRecordPayment={(target) => handleOpenRecordPaymentForTarget(target)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView onConfirmClearWorkspace={handleConfirmClearWorkspace} />
          )}
        </div>
      </main>

      {/* Modals */}
      <AddIncomeModal
        isOpen={addIncomeOpen}
        onClose={() => setAddIncomeOpen(false)}
      />

      <AddExpenseModal
        isOpen={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
      />

      <RecordPaymentModal
        isOpen={recordPaymentOpen}
        onClose={() => {
          setRecordPaymentOpen(false);
          setPaymentInitialTarget(undefined);
        }}
        initialTarget={paymentInitialTarget}
      />

      <EditTransactionModal
        isOpen={editTxModalOpen}
        onClose={() => {
          setEditTxModalOpen(false);
          setTxToEdit(null);
        }}
        transaction={txToEdit}
      />

      <LoanModal
        isOpen={loanModalOpen}
        onClose={() => {
          setLoanModalOpen(false);
          setLoanToEdit(null);
        }}
        loanToEdit={loanToEdit}
      />

      <CreditCardModal
        isOpen={cardModalOpen}
        onClose={() => {
          setCardModalOpen(false);
          setCardToEdit(null);
        }}
        cardToEdit={cardToEdit}
      />

      <CardStatementModal
        isOpen={statementModalOpen}
        onClose={() => {
          setStatementModalOpen(false);
          setStatementCardId(undefined);
        }}
        initialCardId={statementCardId}
      />

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={deleteConfig.onConfirm}
        title={deleteConfig.title}
        message={deleteConfig.message}
      />

      <AcceptInviteModal
        isOpen={!!pendingInviteToAccept}
        onClose={() => setPendingInviteToAccept(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
