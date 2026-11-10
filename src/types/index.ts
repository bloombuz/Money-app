export type PaymentStatus = 'upcoming' | 'due_today' | 'partially_paid' | 'paid' | 'overdue';

export type OwnerType = 'person1' | 'person2' | 'unassigned';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  memberUids: string[];
  person1Name?: string;
  person2Name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string; // member's uid
  workspaceId: string;
  email: string;
  displayName?: string;
  role: 'owner' | 'member';
  linkedProfile: 'person1' | 'person2';
  joinedAt: string;
}

export interface WorkspaceInvite {
  id: string; // token ID
  workspaceId: string;
  workspaceName: string;
  inviterUid: string;
  inviterEmail: string;
  inviterName: string;
  inviteeEmail: string;
  assignProfile: 'person1' | 'person2';
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  usedByUid?: string;
  usedAt?: string;
}

export interface UserProfile {
  userId: string;
  email?: string;
  displayName?: string;
  currency: string;
  timezone: string;
  person1Name?: string;
  person2Name?: string;
  activeWorkspaceId?: string;
  workspaceIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Account {
  id: string;
  userId: string;
  workspaceId?: string;
  createdBy?: string;
  name: string;
  nickname?: string;
  type: 'bank' | 'cash' | 'wallet';
  accountNumberLast4?: string;
  owner?: OwnerType;
  openingBalancePaise: number;
  openingBalanceDate?: string; // YYYY-MM-DD
  reconciliationAdjustmentPaise?: number;
  lastReconciledDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Asset {
  id: string;
  userId: string;
  workspaceId?: string;
  createdBy?: string;
  name: string;
  category?: string; // Investments, EPF, Gold, Real Estate, etc.
  valuePaise: number;
  asOfDate: string; // YYYY-MM-DD
  owner: OwnerType;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  userId: string;
  workspaceId?: string;
  createdBy?: string;
  name: string;
  type: 'inflow' | 'outflow';
  color?: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  workspaceId?: string;
  createdBy?: string; // UID of user who entered the record
  type: 'inflow' | 'outflow' | 'transfer';
  amountPaise: number;
  transactionDate: string; // YYYY-MM-DD
  addedOn: string; // Server/client ISO timestamp when initially created
  updatedAt: string;
  category: string;
  categoryId?: string;
  sourceOrMerchant: string; // Income source or Outflow merchant
  accountId?: string; // Account received into or paid from
  fromAccountId?: string; // For transfers
  toAccountId?: string; // For transfers
  creditCardId?: string; // Credit card paid with (if outflow)
  owner?: OwnerType; // Who received it (inflow) / Who paid (outflow)
  notes?: string;
  isDebtPayment?: boolean; // If true, excluded from category spending
  linkedPaymentId?: string; // Linked payment record ID
}

export interface Loan {
  id: string;
  userId: string;
  workspaceId?: string;
  createdBy?: string;
  lender: string;
  loanName: string;
  originalPrincipalPaise: number;
  currentOutstandingPaise: number;
  balanceAsOfDate: string; // YYYY-MM-DD
  emiAmountPaise: number;
  nextDueDate: string; // YYYY-MM-DD
  remainingInstallments: number;
  owner?: OwnerType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanInstallment {
  id: string;
  userId: string;
  workspaceId?: string;
  createdBy?: string;
  loanId: string;
  month: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  scheduledAmountPaise: number;
  paidAmountPaise: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCard {
  id: string;
  userId: string;
  workspaceId?: string;
  createdBy?: string;
  nickname: string;
  issuer: string;
  lastFourDigits?: string;
  creditLimitPaise?: number;
  openingBalancePaise: number;
  reconciliationAdjustmentPaise?: number;
  owner?: OwnerType;
  createdAt: string;
  updatedAt: string;
}

export interface CardStatement {
  id: string;
  userId: string;
  workspaceId?: string;
  createdBy?: string;
  creditCardId: string;
  statementMonth: string; // YYYY-MM
  statementDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  totalAmountDuePaise: number;
  minimumAmountDuePaise: number;
  paidAmountPaise: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  workspaceId?: string;
  createdBy?: string;
  targetType: 'loan' | 'credit_card';
  targetId: string; // Loan ID or CreditCard ID
  installmentId?: string;
  statementId?: string;
  amountPaise: number;
  principalPaise?: number;
  interestPaise?: number;
  feesPaise?: number;
  isSplitKnown: boolean;
  paidFromAccountId: string;
  paymentDate: string; // YYYY-MM-DD
  linkedOutflowId?: string;
  notes?: string;
  createdAt: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'accounts'
  | 'inflow'
  | 'outflow'
  | 'loans'
  | 'credit_cards'
  | 'calendar'
  | 'settings';

