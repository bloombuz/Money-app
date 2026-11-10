import React, { createContext, useContext, useEffect, useState, useTransition, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  User,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  Account,
  Category,
  Transaction,
  Loan,
  LoanInstallment,
  CreditCard,
  CardStatement,
  Payment,
  ActiveTab,
  Asset,
  OwnerType,
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
} from '../types';
import {
  getKolkataDateString,
  getKolkataMonthString,
  evaluatePaymentStatus,
  calculateNewLoanBalance,
} from '../utils/finance';
import {
  generateInviteToken,
  canRedeemInvite,
  isInviteExpired,
  getDefaultOwnerForMember,
} from '../utils/workspace';

interface FinanceContextType {
  user: User | null;
  loadingAuth: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsDemo: () => void;

  // Workspace & Multi-user Membership
  workspace: Workspace | null;
  workspaceMembers: WorkspaceMember[];
  workspaceInvites: WorkspaceInvite[];
  currentMember: WorkspaceMember | null;
  activeWorkspaceId: string | null;
  createInvite: (email: string, assignProfile: 'person1' | 'person2') => Promise<{ inviteId: string; inviteLink: string }>;
  revokeInvite: (inviteId: string) => Promise<void>;
  redeemInvite: (inviteId: string) => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberUid: string) => Promise<void>;
  updateMemberLinkedProfile: (memberUid: string, linkedProfile: 'person1' | 'person2') => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  pendingInviteToAccept: WorkspaceInvite | null;
  setPendingInviteToAccept: (inv: WorkspaceInvite | null) => void;

  // Data
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  loans: Loan[];
  installments: LoanInstallment[];
  creditCards: CreditCard[];
  statements: CardStatement[];
  payments: Payment[];
  assets: Asset[];

  // Partner profiles & Dashboard filter
  person1Name: string;
  person2Name: string;
  updatePartnerNames: (p1: string, p2: string) => Promise<void>;
  dashboardFilter: 'both' | 'person1' | 'person2';
  setDashboardFilter: (filter: 'both' | 'person1' | 'person2') => void;

  // Month navigation & range
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  customDateRange: { start: string; end: string } | null;
  setCustomDateRange: (range: { start: string; end: string } | null) => void;

  // View navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'userId' | 'addedOn' | 'updatedAt'>) => Promise<void>;
  editTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addAccount: (acc: Omit<Account, 'id' | 'userId'>) => Promise<void>;
  editAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reconcileAccount: (accountId: string, actualBalancePaise: number) => Promise<void>;
  recordTransfer: (data: {
    fromAccountId: string;
    toAccountId: string;
    amountPaise: number;
    transferDate: string;
    notes?: string;
  }) => Promise<void>;
  getAccountBalance: (accountId: string) => number;

  addAsset: (asset: Omit<Asset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  addCategory: (cat: Omit<Category, 'id' | 'userId'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addLoan: (loan: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editLoan: (id: string, updates: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;

  addOrUpdateInstallment: (inst: Omit<LoanInstallment, 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;

  addCreditCard: (card: Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editCreditCard: (id: string, updates: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;

  addCardStatement: (stmt: Omit<CardStatement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editCardStatement: (id: string, updates: Partial<CardStatement>) => Promise<void>;
  deleteCardStatement: (id: string) => Promise<void>;

  recordPayment: (payment: {
    targetType: 'loan' | 'credit_card';
    targetId: string;
    installmentId?: string;
    statementId?: string;
    amountPaise: number;
    principalPaise?: number;
    interestPaise?: number;
    feesPaise?: number;
    isSplitKnown: boolean;
    paidFromAccountId: string;
    paymentDate: string;
    notes?: string;
  }) => Promise<void>;

  deletePayment: (paymentId: string) => Promise<void>;

  // Seed / Clear demo workspace
  seedDemoWorkspace: () => Promise<void>;
  clearWorkspace: () => Promise<void>;

  // Data loading state & error
  loadingData: boolean;
  dataError: string | null;
  refreshData: () => void;

  // Operation feedback
  lastError: string | null;
  clearError: () => void;
  actionSuccess: string | null;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Workspace state
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceInvites, setWorkspaceInvites] = useState<WorkspaceInvite[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [pendingInviteToAccept, setPendingInviteToAccept] = useState<WorkspaceInvite | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const inviteParam = searchParams.get('invite');
      if (!inviteParam) return null;
      const localSaved = localStorage.getItem(`moneydesk_invite_${inviteParam}`);
      if (localSaved) {
        return JSON.parse(localSaved);
      }
    } catch {}
    return null;
  });

  // Core Financial Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<LoanInstallment[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Partner names & Dashboard filter
  const [person1Name, setPerson1Name] = useState<string>('Me');
  const [person2Name, setPerson2Name] = useState<string>('My girlfriend');
  const [dashboardFilter, setDashboardFilter] = useState<'both' | 'person1' | 'person2'>('both');

  const [selectedMonth, setSelectedMonth] = useState<string>(getKolkataMonthString());
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [lastError, setLastError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => {
      setActionSuccess((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const refreshData = () => {
    setDataError(null);
    setLoadingData(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const clearError = () => setLastError(null);

  // Current Member details
  const currentMember = useMemo(() => {
    if (!user) return null;
    return workspaceMembers.find((m) => m.id === user.uid) || null;
  }, [user, workspaceMembers]);

  // Auth state listener & invite URL parameter detector
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const autostart = searchParams.get('autostart') === '1' || searchParams.get('demo') === '1';
    const inviteParam = searchParams.get('invite');

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else if (autostart) {
        setUser({
          uid: 'demo_user',
          email: 'demo@moneydesk.local',
          displayName: 'Demo Account',
        } as User);
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    // Check if invite token in URL
    if (inviteParam) {
      const localSaved = localStorage.getItem(`moneydesk_invite_${inviteParam}`);
      if (localSaved) {
        try {
          setPendingInviteToAccept(JSON.parse(localSaved));
        } catch (e) {
          console.warn('Failed parsing local invite:', e);
        }
      }

      (async () => {
        try {
          const invSnap = await getDoc(doc(db, 'invites', inviteParam));
          if (invSnap.exists()) {
            setPendingInviteToAccept(invSnap.data() as WorkspaceInvite);
          }
        } catch (e) {
          console.warn('Could not load remote invite:', e);
        }
      })();
    }

    return () => unsubscribe();
  }, []);

  // Determine & Initialize Active Workspace for current user
  useEffect(() => {
    if (!user) {
      setWorkspace(null);
      setWorkspaceMembers([]);
      setWorkspaceInvites([]);
      setActiveWorkspaceId(null);
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setLoans([]);
      setInstallments([]);
      setCreditCards([]);
      setStatements([]);
      setPayments([]);
      setAssets([]);
      setLoadingData(false);
      setDataError(null);
      return;
    }

    // Demo Mode Workspace
    if (user.uid === 'demo_user') {
      const demoWsId = 'ws_demo';
      setActiveWorkspaceId(demoWsId);
      const demoWs: Workspace = {
        id: demoWsId,
        name: 'Our Shared Money Desk',
        ownerId: 'demo_user',
        ownerEmail: 'demo@moneydesk.local',
        memberUids: ['demo_user', 'demo_partner'],
        person1Name: 'Rohan',
        person2Name: 'Priya',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setWorkspace(demoWs);
      setWorkspaceMembers([
        {
          id: 'demo_user',
          workspaceId: demoWsId,
          email: 'demo@moneydesk.local',
          displayName: 'Rohan (Owner)',
          role: 'owner',
          linkedProfile: 'person1',
          joinedAt: new Date().toISOString(),
        },
        {
          id: 'demo_partner',
          workspaceId: demoWsId,
          email: 'partner@moneydesk.local',
          displayName: 'Priya',
          role: 'member',
          linkedProfile: 'person2',
          joinedAt: new Date().toISOString(),
        },
      ]);
      setPerson1Name('Rohan');
      setPerson2Name('Priya');

      // Load or seed demo data
      const savedStr = localStorage.getItem('moneydesk_demo_workspace');
      if (savedStr) {
        try {
          const saved = JSON.parse(savedStr);
          if (Array.isArray(saved.accounts)) setAccounts(saved.accounts);
          if (Array.isArray(saved.categories)) setCategories(saved.categories);
          if (Array.isArray(saved.transactions)) setTransactions(saved.transactions);
          if (Array.isArray(saved.loans)) setLoans(saved.loans);
          if (Array.isArray(saved.installments)) setInstallments(saved.installments);
          if (Array.isArray(saved.creditCards)) setCreditCards(saved.creditCards);
          if (Array.isArray(saved.statements)) setStatements(saved.statements);
          if (Array.isArray(saved.payments)) setPayments(saved.payments);
          if (Array.isArray(saved.assets)) setAssets(saved.assets);
          if (Array.isArray(saved.invites)) setWorkspaceInvites(saved.invites);
          setLoadingData(false);
          setDataError(null);
          return;
        } catch (e) {
          console.error('Failed to parse saved demo workspace:', e);
        }
      }
      seedDemoDataLocally();
      setLoadingData(false);
      setDataError(null);
      return;
    }

    // Real Firebase User: Initialize/Lookup Workspace & Migrate Legacy Records if needed
    let isCancelled = false;

    async function initFirebaseWorkspace() {
      if (!user) return;
      try {
        setLoadingData(true);
        const uid = user.uid;

        // 1. Fetch user doc
        const userRef = doc(db, 'users', uid);
        let userSnap = null;
        try {
          userSnap = await getDoc(userRef);
        } catch (e) {
          console.warn('User doc check notice:', e);
        }

        let targetWsId = userSnap?.exists() ? userSnap.data()?.activeWorkspaceId : null;

        // If targetWsId exists, verify it exists and user is a member
        if (targetWsId) {
          try {
            const wsSnap = await getDoc(doc(db, 'workspaces', targetWsId));
            if (!wsSnap.exists() || !wsSnap.data()?.memberUids?.includes(uid)) {
              targetWsId = null;
            }
          } catch (e) {
            console.warn('Could not verify existing workspace membership:', e);
            targetWsId = null;
          }
        }

        // Default workspace ID if none found
        if (!targetWsId) {
          targetWsId = `ws_${uid}`;
          const wsRef = doc(db, 'workspaces', targetWsId);
          let wsExists = false;
          try {
            const wsSnap = await getDoc(wsRef);
            wsExists = wsSnap.exists();
          } catch (e) {
            console.warn('Workspace doc check notice:', e);
          }

          if (!wsExists) {
            // Create user's primary shared workspace
            const newWs: Workspace = {
              id: targetWsId,
              name: `${user.displayName ? user.displayName.split(' ')[0] + "'s" : 'Our'} Money Desk`,
              ownerId: uid,
              ownerEmail: user.email || '',
              memberUids: [uid],
              person1Name: userSnap?.data()?.person1Name || 'Me',
              person2Name: userSnap?.data()?.person2Name || 'My girlfriend',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(wsRef, cleanPayload(newWs));

            // Create initial member record
            const memberDoc: WorkspaceMember = {
              id: uid,
              workspaceId: targetWsId,
              email: user.email || '',
              displayName: user.displayName || 'Owner',
              role: 'owner',
              linkedProfile: 'person1',
              joinedAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'workspaces', targetWsId, 'members', uid), cleanPayload(memberDoc));

            // Update user profile
            await setDoc(
              userRef,
              cleanPayload({
                userId: uid,
                email: user.email || '',
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                activeWorkspaceId: targetWsId,
                workspaceIds: [targetWsId],
                updatedAt: new Date().toISOString(),
              }),
              { merge: true }
            );

            // MIGRATION: Move any existing records from /users/{uid}/* into /workspaces/{targetWsId}/*
            try {
              const collectionsToMigrate = [
                'accounts',
                'categories',
                'transactions',
                'loans',
                'loan_installments',
                'credit_cards',
                'card_statements',
                'payments',
                'assets',
              ];

              for (const colName of collectionsToMigrate) {
                const legacySnap = await getDocs(collection(db, 'users', uid, colName));
                for (const d of legacySnap.docs) {
                  const data = d.data();
                  const migrated = {
                    ...data,
                    workspaceId: targetWsId,
                    createdBy: uid,
                  };
                  await setDoc(doc(db, 'workspaces', targetWsId, colName, d.id), cleanPayload(migrated));
                  await deleteDoc(d.ref);
                }
              }
            } catch (migErr) {
              console.warn('Migration of legacy records notice:', migErr);
            }
          }
        }

        if (!isCancelled) {
          setActiveWorkspaceId(targetWsId);
        }
      } catch (err: any) {
        console.error('Failed to init workspace:', err);
        if (!isCancelled) {
          setActiveWorkspaceId(`ws_${user.uid}`);
          setDataError(err?.message || 'Failed to initialize workspace');
          setLoadingData(false);
        }
      }
    }

    initFirebaseWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Real-time Listeners on the Active Workspace
  useEffect(() => {
    if (!user || user.uid === 'demo_user' || !activeWorkspaceId) return;

    setLoadingData(true);
    setDataError(null);
    const wsId = activeWorkspaceId;
    const unsubscribes: (() => void)[] = [];

    const pendingCollections = new Set([
      'workspace',
      'members',
      'invites',
      'accounts',
      'categories',
      'transactions',
      'loans',
      'loan_installments',
      'credit_cards',
      'card_statements',
      'payments',
      'assets',
    ]);

    const markCollectionLoaded = (name: string) => {
      pendingCollections.delete(name);
      if (pendingCollections.size === 0) {
        setLoadingData(false);
      }
    };

    const safetyTimer = setTimeout(() => {
      setLoadingData(false);
    }, 2000);

    // 1. Workspace metadata
    unsubscribes.push(
      onSnapshot(
        doc(db, 'workspaces', wsId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Workspace;
            setWorkspace(data);
            if (data.person1Name) setPerson1Name(data.person1Name);
            if (data.person2Name) setPerson2Name(data.person2Name);
          }
          markCollectionLoaded('workspace');
        },
        (err) => {
          console.warn('Workspace listener err:', err);
          markCollectionLoaded('workspace');
        }
      )
    );

    // 2. Members subcollection
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'members')),
        (snap) => {
          const list: WorkspaceMember[] = [];
          snap.forEach((d) => list.push(d.data() as WorkspaceMember));
          setWorkspaceMembers(list);
          markCollectionLoaded('members');
        },
        (err) => {
          console.warn('Members listener err:', err);
          markCollectionLoaded('members');
        }
      )
    );

    // 3. Invites subcollection
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'invites')),
        (snap) => {
          const list: WorkspaceInvite[] = [];
          snap.forEach((d) => list.push(d.data() as WorkspaceInvite));
          setWorkspaceInvites(list);
          markCollectionLoaded('invites');
        },
        (err) => {
          console.warn('Invites listener err:', err);
          markCollectionLoaded('invites');
        }
      )
    );

    // 4. Accounts
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'accounts')),
        (snap) => {
          const list: Account[] = [];
          snap.forEach((d) => list.push(d.data() as Account));
          setAccounts(list);
          markCollectionLoaded('accounts');
        },
        (err) => {
          setDataError(err?.message || 'Error loading accounts');
          markCollectionLoaded('accounts');
        }
      )
    );

    // 5. Categories
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'categories')),
        (snap) => {
          const list: Category[] = [];
          snap.forEach((d) => list.push(d.data() as Category));
          setCategories(list);
          markCollectionLoaded('categories');
        },
        (err) => {
          markCollectionLoaded('categories');
        }
      )
    );

    // 6. Transactions
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'transactions')),
        (snap) => {
          const list: Transaction[] = [];
          snap.forEach((d) => list.push(d.data() as Transaction));
          list.sort((a, b) => {
            if (b.transactionDate !== a.transactionDate) {
              return b.transactionDate.localeCompare(a.transactionDate);
            }
            return (b.addedOn || '').localeCompare(a.addedOn || '');
          });
          setTransactions(list);
          markCollectionLoaded('transactions');
        },
        (err) => {
          setDataError(err?.message || 'Error loading transactions');
          markCollectionLoaded('transactions');
        }
      )
    );

    // 7. Loans
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'loans')),
        (snap) => {
          const list: Loan[] = [];
          snap.forEach((d) => list.push(d.data() as Loan));
          setLoans(list);
          markCollectionLoaded('loans');
        },
        (err) => markCollectionLoaded('loans')
      )
    );

    // 8. Loan Installments
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'loan_installments')),
        (snap) => {
          const list: LoanInstallment[] = [];
          snap.forEach((d) => list.push(d.data() as LoanInstallment));
          setInstallments(list);
          markCollectionLoaded('loan_installments');
        },
        (err) => markCollectionLoaded('loan_installments')
      )
    );

    // 9. Credit Cards
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'credit_cards')),
        (snap) => {
          const list: CreditCard[] = [];
          snap.forEach((d) => list.push(d.data() as CreditCard));
          setCreditCards(list);
          markCollectionLoaded('credit_cards');
        },
        (err) => markCollectionLoaded('credit_cards')
      )
    );

    // 10. Card Statements
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'card_statements')),
        (snap) => {
          const list: CardStatement[] = [];
          snap.forEach((d) => list.push(d.data() as CardStatement));
          setStatements(list);
          markCollectionLoaded('card_statements');
        },
        (err) => markCollectionLoaded('card_statements')
      )
    );

    // 11. Payments
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'payments')),
        (snap) => {
          const list: Payment[] = [];
          snap.forEach((d) => list.push(d.data() as Payment));
          setPayments(list);
          markCollectionLoaded('payments');
        },
        (err) => markCollectionLoaded('payments')
      )
    );

    // 12. Assets
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'workspaces', wsId, 'assets')),
        (snap) => {
          const list: Asset[] = [];
          snap.forEach((d) => list.push(d.data() as Asset));
          setAssets(list);
          markCollectionLoaded('assets');
        },
        (err) => markCollectionLoaded('assets')
      )
    );

    return () => {
      clearTimeout(safetyTimer);
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user, activeWorkspaceId, refreshTrigger]);

  // Persist demo state changes to localStorage
  useEffect(() => {
    if (user?.uid === 'demo_user' && !loadingData) {
      try {
        localStorage.setItem(
          'moneydesk_demo_workspace',
          JSON.stringify({
            accounts,
            categories,
            transactions,
            loans,
            installments,
            creditCards,
            statements,
            payments,
            assets,
            invites: workspaceInvites,
            person1Name,
            person2Name,
          })
        );
      } catch (err) {
        console.error('Failed to sync demo workspace to localStorage:', err);
      }
    }
  }, [
    user,
    loadingData,
    accounts,
    categories,
    transactions,
    loans,
    installments,
    creditCards,
    statements,
    payments,
    assets,
    workspaceInvites,
    person1Name,
    person2Name,
  ]);

  const signIn = async () => {
    try {
      setLastError(null);
      await signInWithPopup(auth, googleProvider);
      showSuccess('Signed in successfully');
    } catch (err) {
      console.error(err);
      setLastError(err instanceof Error ? err.message : 'Failed to sign in');
    }
  };

  const signOut = async () => {
    try {
      setLastError(null);
      await firebaseSignOut(auth);
      setUser(null);
      showSuccess('Signed out');
    } catch (err) {
      console.error(err);
      setLastError(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  const continueAsDemo = () => {
    setUser({
      uid: 'demo_user',
      email: 'demo@moneydesk.local',
      displayName: 'Demo Account',
    } as User);
    showSuccess('Viewing demo workspace');
  };

  // Workspace Actions
  const createInvite = async (
    inviteeEmail: string,
    assignProfile: 'person1' | 'person2'
  ): Promise<{ inviteId: string; inviteLink: string }> => {
    if (!user || !activeWorkspaceId) {
      throw new Error('Must be signed in to an active workspace to invite members.');
    }

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const cleanEmail = inviteeEmail.trim().toLowerCase();

    const inviteData: WorkspaceInvite = {
      id: token,
      workspaceId: activeWorkspaceId,
      workspaceName: workspace?.name || 'Money Desk',
      inviterUid: user.uid,
      inviterEmail: user.email || '',
      inviterName: user.displayName || 'Owner',
      inviteeEmail: cleanEmail,
      assignProfile,
      createdAt: new Date().toISOString(),
      expiresAt,
      status: 'pending',
    };

    if (user.uid === 'demo_user') {
      const updatedInvites = [...workspaceInvites, inviteData];
      setWorkspaceInvites(updatedInvites);
      localStorage.setItem(`moneydesk_invite_${token}`, JSON.stringify(inviteData));
      showSuccess(`Invite created for ${cleanEmail}`);
      const link = `${window.location.origin}/?invite=${token}`;
      return { inviteId: token, inviteLink: link };
    }

    // Write to both /invites/{token} and /workspaces/{wsId}/invites/{token}
    await setDoc(doc(db, 'invites', token), cleanPayload(inviteData));
    await setDoc(doc(db, 'workspaces', activeWorkspaceId, 'invites', token), cleanPayload(inviteData));

    showSuccess(`Invite created for ${cleanEmail}`);
    const link = `${window.location.origin}/?invite=${token}`;
    return { inviteId: token, inviteLink: link };
  };

  const revokeInvite = async (inviteId: string) => {
    if (!user || !activeWorkspaceId) return;

    if (user.uid === 'demo_user') {
      setWorkspaceInvites((prev) =>
        prev.map((i) => (i.id === inviteId ? { ...i, status: 'revoked' } : i))
      );
      localStorage.removeItem(`moneydesk_invite_${inviteId}`);
      showSuccess('Invitation revoked');
      return;
    }

    await setDoc(doc(db, 'invites', inviteId), { status: 'revoked' }, { merge: true });
    await setDoc(
      doc(db, 'workspaces', activeWorkspaceId, 'invites', inviteId),
      { status: 'revoked' },
      { merge: true }
    );
    showSuccess('Invitation revoked');
  };

  const redeemInvite = async (inviteId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Please sign in first to accept this invitation.' };
    }

    try {
      // 1. Fetch invite
      let invite: WorkspaceInvite | null = null;
      if (user.uid === 'demo_user') {
        const local = localStorage.getItem(`moneydesk_invite_${inviteId}`);
        if (local) invite = JSON.parse(local);
      } else {
        const snap = await getDoc(doc(db, 'invites', inviteId));
        if (snap.exists()) {
          invite = snap.data() as WorkspaceInvite;
        }
      }

      if (!invite) {
        return { success: false, error: 'Invitation not found or invalid.' };
      }

      // 2. Validate redemption
      const validation = canRedeemInvite(invite, user.email, user.emailVerified ?? true);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      const wsId = invite.workspaceId;

      if (user.uid === 'demo_user') {
        // Mock join
        setWorkspaceMembers((prev) => [
          ...prev,
          {
            id: user.uid,
            workspaceId: wsId,
            email: user.email || 'demo@moneydesk.local',
            displayName: user.displayName || 'Accepted Member',
            role: 'member',
            linkedProfile: invite.assignProfile,
            joinedAt: new Date().toISOString(),
          },
        ]);
        setActiveWorkspaceId(wsId);
        setPendingInviteToAccept(null);
        showSuccess(`Joined workspace "${invite.workspaceName}"`);
        return { success: true };
      }

      // 3. Add user to workspace memberUids
      const wsRef = doc(db, 'workspaces', wsId);
      const wsSnap = await getDoc(wsRef);
      if (wsSnap.exists()) {
        const curMemberUids = wsSnap.data()?.memberUids || [];
        if (!curMemberUids.includes(user.uid)) {
          await setDoc(
            wsRef,
            {
              memberUids: [...curMemberUids, user.uid],
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }

      // 4. Create member record
      const memberDoc: WorkspaceMember = {
        id: user.uid,
        workspaceId: wsId,
        email: user.email || '',
        displayName: user.displayName || 'Member',
        role: 'member',
        linkedProfile: invite.assignProfile,
        joinedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'workspaces', wsId, 'members', user.uid), cleanPayload(memberDoc));

      // 5. Update invite record to accepted
      const acceptanceUpdates = {
        status: 'accepted',
        usedByUid: user.uid,
        usedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'invites', inviteId), acceptanceUpdates, { merge: true });
      await setDoc(doc(db, 'workspaces', wsId, 'invites', inviteId), acceptanceUpdates, {
        merge: true,
      });

      // 6. Update user's active workspace
      await setDoc(
        doc(db, 'users', user.uid),
        {
          activeWorkspaceId: wsId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setActiveWorkspaceId(wsId);
      setPendingInviteToAccept(null);

      // Clean query parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);

      showSuccess(`Joined workspace "${invite.workspaceName}"`);
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err?.message || 'Failed to accept invitation' };
    }
  };

  const removeMember = async (memberUid: string) => {
    if (!user || !activeWorkspaceId) return;
    if (workspace && workspace.ownerId !== user.uid && user.uid !== 'demo_user') {
      throw new Error('Only the workspace owner can remove members.');
    }

    if (user.uid === 'demo_user') {
      setWorkspaceMembers((prev) => prev.filter((m) => m.id !== memberUid));
      showSuccess('Member removed from workspace');
      return;
    }

    const wsId = activeWorkspaceId;
    await deleteDoc(doc(db, 'workspaces', wsId, 'members', memberUid));

    if (workspace) {
      const updatedUids = (workspace.memberUids || []).filter((id) => id !== memberUid);
      await setDoc(
        doc(db, 'workspaces', wsId),
        {
          memberUids: updatedUids,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    showSuccess('Member removed from workspace');
  };

  const updateMemberLinkedProfile = async (
    memberUid: string,
    linkedProfile: 'person1' | 'person2'
  ) => {
    if (!user || !activeWorkspaceId) return;

    if (user.uid === 'demo_user') {
      setWorkspaceMembers((prev) =>
        prev.map((m) => (m.id === memberUid ? { ...m, linkedProfile } : m))
      );
      showSuccess('Member profile assignment updated');
      return;
    }

    await setDoc(
      doc(db, 'workspaces', activeWorkspaceId, 'members', memberUid),
      { linkedProfile },
      { merge: true }
    );
    showSuccess('Member profile assignment updated');
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!user) return;
    setActiveWorkspaceId(workspaceId);
    if (user.uid !== 'demo_user') {
      await setDoc(
        doc(db, 'users', user.uid),
        { activeWorkspaceId: workspaceId },
        { merge: true }
      );
    }
    showSuccess('Switched workspace');
  };

  // Partner names
  const updatePartnerNames = async (p1: string, p2: string) => {
    setPerson1Name(p1);
    setPerson2Name(p2);

    if (activeWorkspaceId && user?.uid !== 'demo_user') {
      await setDoc(
        doc(db, 'workspaces', activeWorkspaceId),
        {
          person1Name: p1,
          person2Name: p2,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else if (user?.uid !== 'demo_user' && user) {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          person1Name: p1,
          person2Name: p2,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    showSuccess('Partner names updated');
  };

  // Target collection helper
  const getDocRef = (collectionName: string, id: string) => {
    if (activeWorkspaceId) {
      return doc(db, 'workspaces', activeWorkspaceId, collectionName, id);
    }
    return doc(db, 'users', user?.uid || 'temp', collectionName, id);
  };

  // ADD TRANSACTION
  const addTransaction = async (
    txData: Omit<Transaction, 'id' | 'userId' | 'addedOn' | 'updatedAt'>
  ) => {
    if (!user) {
      setLastError('You must be signed in to add transactions');
      return;
    }
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const defaultOwner = getDefaultOwnerForMember(currentMember);

    const newTx: Transaction = {
      ...txData,
      id,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      owner: txData.owner || defaultOwner,
      addedOn: nowIso,
      updatedAt: nowIso,
    };

    if (user.uid === 'demo_user') {
      setTransactions((prev) => [newTx, ...prev]);
      showSuccess(`Recorded ${txData.type}: ${txData.sourceOrMerchant}`);
      return;
    }

    try {
      await setDoc(getDocRef('transactions', id), cleanPayload(newTx));
      showSuccess(`Recorded ${txData.type}: ${txData.sourceOrMerchant}`);
    } catch (err) {
      console.error(err);
      setLastError('Failed to save transaction');
    }
  };

  const editTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;
    const nowIso = new Date().toISOString();

    if (user.uid === 'demo_user') {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: nowIso } : t))
      );
      showSuccess('Transaction updated');
      return;
    }

    try {
      await setDoc(getDocRef('transactions', id), cleanPayload({ ...updates, updatedAt: nowIso }), {
        merge: true,
      });
      showSuccess('Transaction updated');
    } catch (err) {
      console.error(err);
      setLastError('Failed to update transaction');
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    if (user.uid === 'demo_user') {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      showSuccess('Transaction removed');
      return;
    }
    try {
      await deleteDoc(getDocRef('transactions', id));
      showSuccess('Transaction removed');
    } catch (err) {
      console.error(err);
      setLastError('Failed to delete transaction');
    }
  };

  // ACCOUNTS
  const addAccount = async (accData: Omit<Account, 'id' | 'userId'>) => {
    if (!user) return;
    const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const defaultOwner = getDefaultOwnerForMember(currentMember);

    const newAcc: Account = {
      ...accData,
      id,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      owner: accData.owner || defaultOwner,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (user.uid === 'demo_user') {
      setAccounts((prev) => [...prev, newAcc]);
      showSuccess(`Account "${accData.name}" created`);
      return;
    }

    try {
      await setDoc(getDocRef('accounts', id), cleanPayload(newAcc));
      showSuccess(`Account "${accData.name}" created`);
    } catch (err) {
      console.error(err);
      setLastError('Failed to create account');
    }
  };

  const editAccount = async (id: string, updates: Partial<Account>) => {
    if (!user) return;
    const nowIso = new Date().toISOString();

    if (user.uid === 'demo_user') {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: nowIso } : a))
      );
      showSuccess('Account updated');
      return;
    }

    try {
      await setDoc(getDocRef('accounts', id), cleanPayload({ ...updates, updatedAt: nowIso }), {
        merge: true,
      });
      showSuccess('Account updated');
    } catch (err) {
      console.error(err);
      setLastError('Failed to update account');
    }
  };

  const deleteAccount = async (id: string) => {
    if (!user) return;
    if (user.uid === 'demo_user') {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      showSuccess('Account deleted');
      return;
    }
    try {
      await deleteDoc(getDocRef('accounts', id));
      showSuccess('Account deleted');
    } catch (err) {
      console.error(err);
      setLastError('Failed to delete account');
    }
  };

  const reconcileAccount = async (accountId: string, actualBalancePaise: number) => {
    const calculated = getAccountBalance(accountId);
    const targetAccount = accounts.find((a) => a.id === accountId);
    if (!targetAccount) return;

    const existingAdjustment = targetAccount.reconciliationAdjustmentPaise || 0;
    const discrepancy = actualBalancePaise - calculated;
    const newAdjustment = existingAdjustment + discrepancy;
    const nowKolkata = getKolkataDateString();

    await editAccount(accountId, {
      reconciliationAdjustmentPaise: newAdjustment,
      lastReconciledDate: nowKolkata,
    });
    showSuccess('Account reconciled with bank balance');
  };

  const recordTransfer = async (data: {
    fromAccountId: string;
    toAccountId: string;
    amountPaise: number;
    transferDate: string;
    notes?: string;
  }) => {
    const fromAcc = accounts.find((a) => a.id === data.fromAccountId);
    const toAcc = accounts.find((a) => a.id === data.toAccountId);
    const sourceDesc = `Transfer: ${fromAcc?.nickname || fromAcc?.name} → ${toAcc?.nickname || toAcc?.name}`;

    await addTransaction({
      type: 'transfer',
      amountPaise: data.amountPaise,
      transactionDate: data.transferDate,
      category: 'Transfer',
      sourceOrMerchant: sourceDesc,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      notes: data.notes,
      owner: fromAcc?.owner || 'unassigned',
    });
  };

  const getAccountBalance = (accountId: string): number => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return 0;

    let balance = (acc.openingBalancePaise || 0) + (acc.reconciliationAdjustmentPaise || 0);

    transactions.forEach((tx) => {
      if (tx.type === 'inflow' && tx.accountId === accountId) {
        balance += tx.amountPaise;
      } else if (tx.type === 'outflow' && tx.accountId === accountId) {
        balance -= tx.amountPaise;
      } else if (tx.type === 'transfer') {
        if (tx.toAccountId === accountId) {
          balance += tx.amountPaise;
        }
        if (tx.fromAccountId === accountId) {
          balance -= tx.amountPaise;
        }
      }
    });

    return balance;
  };

  // ASSETS
  const addAsset = async (assetData: Omit<Asset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newAsset: Asset = {
      ...assetData,
      id,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (user.uid === 'demo_user') {
      setAssets((prev) => [...prev, newAsset]);
      showSuccess(`Asset "${assetData.name}" added`);
      return;
    }

    try {
      await setDoc(getDocRef('assets', id), cleanPayload(newAsset));
      showSuccess(`Asset "${assetData.name}" added`);
    } catch (err) {
      console.error(err);
      setLastError('Failed to add asset');
    }
  };

  const editAsset = async (id: string, updates: Partial<Asset>) => {
    if (!user) return;
    const nowIso = new Date().toISOString();

    if (user.uid === 'demo_user') {
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: nowIso } : a))
      );
      showSuccess('Asset updated');
      return;
    }

    try {
      await setDoc(getDocRef('assets', id), cleanPayload({ ...updates, updatedAt: nowIso }), {
        merge: true,
      });
      showSuccess('Asset updated');
    } catch (err) {
      console.error(err);
      setLastError('Failed to update asset');
    }
  };

  const deleteAsset = async (id: string) => {
    if (!user) return;
    if (user.uid === 'demo_user') {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      showSuccess('Asset deleted');
      return;
    }
    try {
      await deleteDoc(getDocRef('assets', id));
      showSuccess('Asset deleted');
    } catch (err) {
      console.error(err);
      setLastError('Failed to delete asset');
    }
  };

  // CATEGORIES
  const addCategory = async (catData: Omit<Category, 'id' | 'userId'>) => {
    if (!user) return;
    const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCat: Category = {
      ...catData,
      id,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
    };

    if (user.uid === 'demo_user') {
      setCategories((prev) => [...prev, newCat]);
      showSuccess(`Category "${catData.name}" created`);
      return;
    }

    try {
      await setDoc(getDocRef('categories', id), cleanPayload(newCat));
      showSuccess(`Category "${catData.name}" created`);
    } catch (err) {
      console.error(err);
      setLastError('Failed to add category');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    if (user.uid === 'demo_user') {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showSuccess('Category removed');
      return;
    }
    try {
      await deleteDoc(getDocRef('categories', id));
      showSuccess('Category removed');
    } catch (err) {
      console.error(err);
      setLastError('Failed to delete category');
    }
  };

  // LOANS
  const addLoan = async (loanData: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const id = `loan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const defaultOwner = getDefaultOwnerForMember(currentMember);

    const newLoan: Loan = {
      ...loanData,
      id,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      owner: loanData.owner || defaultOwner,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Auto-generate initial installment for next due date
    const month = loanData.nextDueDate.substring(0, 7);
    const instId = `inst_${id}_${month}`;
    const initialInstallment: LoanInstallment = {
      id: instId,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      loanId: id,
      month,
      dueDate: loanData.nextDueDate,
      scheduledAmountPaise: loanData.emiAmountPaise,
      paidAmountPaise: 0,
      status: evaluatePaymentStatus(
        loanData.emiAmountPaise,
        0,
        loanData.nextDueDate,
        getKolkataDateString()
      ),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (user.uid === 'demo_user') {
      setLoans((prev) => [...prev, newLoan]);
      setInstallments((prev) => [...prev, initialInstallment]);
      showSuccess(`Loan "${loanData.loanName}" saved`);
      return;
    }

    try {
      await setDoc(getDocRef('loans', id), cleanPayload(newLoan));
      await setDoc(getDocRef('loan_installments', instId), cleanPayload(initialInstallment));
      showSuccess(`Loan "${loanData.loanName}" saved`);
    } catch (err) {
      console.error(err);
      setLastError('Failed to add loan');
    }
  };

  const editLoan = async (id: string, updates: Partial<Loan>) => {
    if (!user) return;
    const nowIso = new Date().toISOString();

    if (user.uid === 'demo_user') {
      setLoans((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: nowIso } : l))
      );
      showSuccess('Loan updated');
      return;
    }

    try {
      await setDoc(getDocRef('loans', id), cleanPayload({ ...updates, updatedAt: nowIso }), {
        merge: true,
      });
      showSuccess('Loan updated');
    } catch (err) {
      console.error(err);
      setLastError('Failed to update loan');
    }
  };

  const deleteLoan = async (id: string) => {
    if (!user) return;
    if (user.uid === 'demo_user') {
      setLoans((prev) => prev.filter((l) => l.id !== id));
      setInstallments((prev) => prev.filter((i) => i.loanId !== id));
      showSuccess('Loan deleted');
      return;
    }
    try {
      await deleteDoc(getDocRef('loans', id));
      const relatedInst = installments.filter((i) => i.loanId === id);
      for (const inst of relatedInst) {
        await deleteDoc(getDocRef('loan_installments', inst.id));
      }
      showSuccess('Loan deleted');
    } catch (err) {
      console.error(err);
      setLastError('Failed to delete loan');
    }
  };

  const addOrUpdateInstallment = async (
    inst: Omit<LoanInstallment, 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const instRecord: LoanInstallment = {
      ...inst,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (user.uid === 'demo_user') {
      setInstallments((prev) => {
        const idx = prev.findIndex((i) => i.id === inst.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = instRecord;
          return updated;
        }
        return [...prev, instRecord];
      });
      return;
    }

    await setDoc(getDocRef('loan_installments', inst.id), cleanPayload(instRecord), {
      merge: true,
    });
  };

  // CREDIT CARDS
  const addCreditCard = async (
    cardData: Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) return;
    const id = `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const defaultOwner = getDefaultOwnerForMember(currentMember);

    const newCard: CreditCard = {
      ...cardData,
      id,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      owner: cardData.owner || defaultOwner,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (user.uid === 'demo_user') {
      setCreditCards((prev) => [...prev, newCard]);
      showSuccess(`Credit Card "${cardData.nickname}" saved`);
      return;
    }

    try {
      await setDoc(getDocRef('credit_cards', id), cleanPayload(newCard));
      showSuccess(`Credit Card "${cardData.nickname}" saved`);
    } catch (err) {
      console.error(err);
      setLastError('Failed to save credit card');
    }
  };

  const editCreditCard = async (id: string, updates: Partial<CreditCard>) => {
    if (!user) return;
    const nowIso = new Date().toISOString();

    if (user.uid === 'demo_user') {
      setCreditCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: nowIso } : c))
      );
      showSuccess('Credit card updated');
      return;
    }

    try {
      await setDoc(getDocRef('credit_cards', id), cleanPayload({ ...updates, updatedAt: nowIso }), {
        merge: true,
      });
      showSuccess('Credit card updated');
    } catch (err) {
      console.error(err);
      setLastError('Failed to update card');
    }
  };

  const deleteCreditCard = async (id: string) => {
    if (!user) return;
    if (user.uid === 'demo_user') {
      setCreditCards((prev) => prev.filter((c) => c.id !== id));
      setStatements((prev) => prev.filter((s) => s.creditCardId !== id));
      showSuccess('Credit card deleted');
      return;
    }
    try {
      await deleteDoc(getDocRef('credit_cards', id));
      const cardStmts = statements.filter((s) => s.creditCardId === id);
      for (const st of cardStmts) {
        await deleteDoc(getDocRef('card_statements', st.id));
      }
      showSuccess('Credit card deleted');
    } catch (err) {
      console.error(err);
      setLastError('Failed to delete card');
    }
  };

  const addCardStatement = async (
    stmtData: Omit<CardStatement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) return;
    const id = `stmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newStmt: CardStatement = {
      ...stmtData,
      id,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (user.uid === 'demo_user') {
      setStatements((prev) => [...prev, newStmt]);
      showSuccess('Card statement recorded');
      return;
    }

    try {
      await setDoc(getDocRef('card_statements', id), cleanPayload(newStmt));
      showSuccess('Card statement recorded');
    } catch (err) {
      console.error(err);
      setLastError('Failed to save statement');
    }
  };

  const editCardStatement = async (id: string, updates: Partial<CardStatement>) => {
    if (!user) return;
    const nowIso = new Date().toISOString();

    if (user.uid === 'demo_user') {
      setStatements((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: nowIso } : s))
      );
      showSuccess('Statement updated');
      return;
    }

    try {
      await setDoc(getDocRef('card_statements', id), cleanPayload({ ...updates, updatedAt: nowIso }), {
        merge: true,
      });
      showSuccess('Statement updated');
    } catch (err) {
      console.error(err);
      setLastError('Failed to update statement');
    }
  };

  const deleteCardStatement = async (id: string) => {
    if (!user) return;
    if (user.uid === 'demo_user') {
      setStatements((prev) => prev.filter((s) => s.id !== id));
      showSuccess('Statement deleted');
      return;
    }
    try {
      await deleteDoc(getDocRef('card_statements', id));
      showSuccess('Statement deleted');
    } catch (err) {
      console.error(err);
      setLastError('Failed to delete statement');
    }
  };

  // RECORD PAYMENT
  const recordPayment = async (data: {
    targetType: 'loan' | 'credit_card';
    targetId: string;
    installmentId?: string;
    statementId?: string;
    amountPaise: number;
    principalPaise?: number;
    interestPaise?: number;
    feesPaise?: number;
    isSplitKnown: boolean;
    paidFromAccountId: string;
    paymentDate: string;
    notes?: string;
  }) => {
    if (!user) return;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const outflowId = `tx_outflow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const today = getKolkataDateString();

    let targetTitle = 'Debt Payment';
    let targetOwner: OwnerType = 'unassigned';

    if (data.targetType === 'loan') {
      const loan = loans.find((l) => l.id === data.targetId);
      targetTitle = loan ? `Loan EMI: ${loan.lender} (${loan.loanName})` : 'Loan EMI Payment';
      targetOwner = loan?.owner || 'unassigned';
    } else {
      const card = creditCards.find((c) => c.id === data.targetId);
      targetTitle = card ? `Card Bill: ${card.nickname}` : 'Credit Card Payment';
      targetOwner = card?.owner || 'unassigned';
    }

    const newPayment: Payment = {
      id: paymentId,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      targetType: data.targetType,
      targetId: data.targetId,
      installmentId: data.installmentId,
      statementId: data.statementId,
      amountPaise: data.amountPaise,
      principalPaise: data.principalPaise,
      interestPaise: data.interestPaise,
      feesPaise: data.feesPaise,
      isSplitKnown: data.isSplitKnown,
      paidFromAccountId: data.paidFromAccountId,
      paymentDate: data.paymentDate,
      linkedOutflowId: outflowId,
      notes: data.notes,
      createdAt: nowIso,
    };

    const linkedOutflow: Transaction = {
      id: outflowId,
      userId: user.uid,
      workspaceId: activeWorkspaceId || undefined,
      createdBy: user.uid,
      type: 'outflow',
      amountPaise: data.amountPaise,
      transactionDate: data.paymentDate,
      category: data.targetType === 'loan' ? 'Loan EMI' : 'Credit Card Bill',
      sourceOrMerchant: targetTitle,
      accountId: data.paidFromAccountId,
      owner: targetOwner,
      isDebtPayment: true,
      linkedPaymentId: paymentId,
      notes: data.notes,
      addedOn: nowIso,
      updatedAt: nowIso,
    };

    if (user.uid === 'demo_user') {
      setPayments((prev) => [newPayment, ...prev]);
      setTransactions((prev) => [linkedOutflow, ...prev]);

      if (data.targetType === 'loan') {
        const loan = loans.find((l) => l.id === data.targetId);
        if (loan) {
          const principalReduction = data.isSplitKnown
            ? data.principalPaise || 0
            : data.amountPaise;
          const newPrincipal = calculateNewLoanBalance(
            loan.currentOutstandingPaise,
            principalReduction
          );
          setLoans((prev) =>
            prev.map((l) =>
              l.id === loan.id
                ? {
                    ...l,
                    currentOutstandingPaise: newPrincipal,
                    balanceAsOfDate: data.paymentDate,
                  }
                : l
            )
          );
        }
        if (data.installmentId) {
          setInstallments((prev) =>
            prev.map((inst) => {
              if (inst.id === data.installmentId) {
                const newPaid = inst.paidAmountPaise + data.amountPaise;
                return {
                  ...inst,
                  paidAmountPaise: newPaid,
                  status: evaluatePaymentStatus(
                    inst.scheduledAmountPaise,
                    newPaid,
                    inst.dueDate,
                    today
                  ),
                };
              }
              return inst;
            })
          );
        }
      } else {
        if (data.statementId) {
          setStatements((prev) =>
            prev.map((st) => {
              if (st.id === data.statementId) {
                const newPaid = st.paidAmountPaise + data.amountPaise;
                return {
                  ...st,
                  paidAmountPaise: newPaid,
                  status: evaluatePaymentStatus(
                    st.totalAmountDuePaise,
                    newPaid,
                    st.dueDate,
                    today
                  ),
                };
              }
              return st;
            })
          );
        }
      }
      showSuccess('Payment recorded and balances updated');
      return;
    }

    try {
      await setDoc(getDocRef('payments', paymentId), cleanPayload(newPayment));
      await setDoc(getDocRef('transactions', outflowId), cleanPayload(linkedOutflow));

      if (data.targetType === 'loan') {
        const loan = loans.find((l) => l.id === data.targetId);
        if (loan) {
          const principalReduction = data.isSplitKnown
            ? data.principalPaise || 0
            : data.amountPaise;
          const newPrincipal = calculateNewLoanBalance(
            loan.currentOutstandingPaise,
            principalReduction
          );
          await editLoan(loan.id, {
            currentOutstandingPaise: newPrincipal,
            balanceAsOfDate: data.paymentDate,
          });
        }
        if (data.installmentId) {
          const inst = installments.find((i) => i.id === data.installmentId);
          if (inst) {
            const newPaid = inst.paidAmountPaise + data.amountPaise;
            await addOrUpdateInstallment({
              ...inst,
              paidAmountPaise: newPaid,
              status: evaluatePaymentStatus(
                inst.scheduledAmountPaise,
                newPaid,
                inst.dueDate,
                today
              ),
            });
          }
        }
      } else {
        if (data.statementId) {
          const stmt = statements.find((s) => s.id === data.statementId);
          if (stmt) {
            const newPaid = stmt.paidAmountPaise + data.amountPaise;
            await editCardStatement(stmt.id, {
              paidAmountPaise: newPaid,
              status: evaluatePaymentStatus(
                stmt.totalAmountDuePaise,
                newPaid,
                stmt.dueDate,
                today
              ),
            });
          }
        }
      }
      showSuccess('Payment recorded and balances updated');
    } catch (err) {
      console.error(err);
      setLastError('Failed to record payment');
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!user) return;
    const pay = payments.find((p) => p.id === paymentId);
    if (!pay) return;

    if (user.uid === 'demo_user') {
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      if (pay.linkedOutflowId) {
        setTransactions((prev) => prev.filter((t) => t.id !== pay.linkedOutflowId));
      }
      showSuccess('Payment deleted');
      return;
    }

    try {
      await deleteDoc(getDocRef('payments', paymentId));
      if (pay.linkedOutflowId) {
        await deleteDoc(getDocRef('transactions', pay.linkedOutflowId));
      }
      showSuccess('Payment deleted');
    } catch (err) {
      console.error(err);
      setLastError('Failed to delete payment');
    }
  };

  // Seed demo workspace with realistic couple data
  const seedDemoDataLocally = () => {
    const currentMonth = getKolkataMonthString();
    const today = getKolkataDateString();
    const nowIso = new Date().toISOString();

    const sampleAccounts: Account[] = [
      {
        id: 'acc_hdfc_salary',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        name: 'HDFC Corporate Salary',
        nickname: 'HDFC Salary',
        type: 'bank',
        accountNumberLast4: '4192',
        owner: 'person1',
        openingBalancePaise: 28400000, // ₹2,84,000
        openingBalanceDate: `${currentMonth}-01`,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'acc_icici_savings',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        name: 'ICICI Wealth Savings',
        nickname: 'ICICI Savings',
        type: 'bank',
        accountNumberLast4: '7721',
        owner: 'person2',
        openingBalancePaise: 18500000, // ₹1,85,000
        openingBalanceDate: `${currentMonth}-01`,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'acc_cash_home',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        name: 'Household Cash Reserve',
        nickname: 'Cash in Hand',
        type: 'cash',
        owner: 'person1',
        openingBalancePaise: 2500000, // ₹25,000
        openingBalanceDate: `${currentMonth}-01`,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    const sampleCategories: Category[] = [
      { id: 'cat_salary', userId: 'demo_user', name: 'Salary', type: 'inflow', color: '#10B981' },
      { id: 'cat_freelance', userId: 'demo_user', name: 'Consulting & Tech', type: 'inflow', color: '#06B6D4' },
      { id: 'cat_groceries', userId: 'demo_user', name: 'Groceries & Household', type: 'outflow', color: '#F59E0B' },
      { id: 'cat_dining', userId: 'demo_user', name: 'Dining & Cafes', type: 'outflow', color: '#EF4444' },
      { id: 'cat_utilities', userId: 'demo_user', name: 'Utilities & Bills', type: 'outflow', color: '#8B5CF6' },
      { id: 'cat_shopping', userId: 'demo_user', name: 'Shopping & Clothes', type: 'outflow', color: '#EC4899' },
    ];

    const sampleAssets: Asset[] = [
      {
        id: 'asset_mf_rohan',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        name: 'Index Mutual Funds Portfolio',
        category: 'Mutual Funds',
        valuePaise: 42000000, // ₹4,20,000
        asOfDate: `${currentMonth}-01`,
        owner: 'person1',
        notes: 'Nifty 50 Index + Parag Parikh Flexi Cap',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'asset_gold_priya',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        name: 'Sovereign Gold Bonds (SGB)',
        category: 'Gold',
        valuePaise: 18500000, // ₹1,85,000
        asOfDate: `${currentMonth}-01`,
        owner: 'person2',
        notes: 'RBI Gold Bonds Series IV',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    const sampleCards: CreditCard[] = [
      {
        id: 'card_icici_amazon',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        nickname: 'Amazon Pay ICICI',
        issuer: 'ICICI Bank',
        lastFourDigits: '8910',
        creditLimitPaise: 25000000,
        openingBalancePaise: 1540000,
        owner: 'person1',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'card_axis_airtel',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        nickname: 'Axis Airtel Rewards',
        issuer: 'Axis Bank',
        lastFourDigits: '3049',
        creditLimitPaise: 15000000,
        openingBalancePaise: 420000,
        owner: 'person2',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    const sampleStatements: CardStatement[] = [
      {
        id: `stmt_icici_${currentMonth}`,
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        creditCardId: 'card_icici_amazon',
        statementMonth: currentMonth,
        statementDate: `${currentMonth}-02`,
        dueDate: `${currentMonth}-22`,
        totalAmountDuePaise: 1540000,
        minimumAmountDuePaise: 150000,
        paidAmountPaise: 0,
        status: evaluatePaymentStatus(1540000, 0, `${currentMonth}-22`, today),
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    const sampleLoans: Loan[] = [
      {
        id: 'loan_renovation',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        lender: 'HDFC Bank',
        loanName: 'Apartment Interior Loan',
        originalPrincipalPaise: 50000000, // ₹5,00,000
        currentOutstandingPaise: 42000000, // ₹4,20,000
        balanceAsOfDate: `${currentMonth}-01`,
        emiAmountPaise: 1850000, // ₹18,500
        nextDueDate: `${currentMonth}-15`,
        remainingInstallments: 26,
        owner: 'person1',
        notes: 'Fixed 9.2% interest rate',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    const sampleInstallments: LoanInstallment[] = [
      {
        id: `inst_renov_${currentMonth}`,
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        loanId: 'loan_renovation',
        month: currentMonth,
        dueDate: `${currentMonth}-15`,
        scheduledAmountPaise: 1850000,
        paidAmountPaise: 0,
        status: evaluatePaymentStatus(1850000, 0, `${currentMonth}-15`, today),
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    const sampleTransactions: Transaction[] = [
      {
        id: 'tx_salary_rohan',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        type: 'inflow',
        amountPaise: 18500000, // ₹1,85,000
        transactionDate: `${currentMonth}-01`,
        category: 'Salary',
        sourceOrMerchant: 'TechCorp India Pvt Ltd',
        accountId: 'acc_hdfc_salary',
        owner: 'person1',
        notes: 'Monthly corporate net salary',
        addedOn: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'tx_salary_priya',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_partner',
        type: 'inflow',
        amountPaise: 14500000, // ₹1,45,000
        transactionDate: `${currentMonth}-02`,
        category: 'Consulting & Tech',
        sourceOrMerchant: 'Design Studio Client Retainer',
        accountId: 'acc_icici_savings',
        owner: 'person2',
        notes: 'Design consulting monthly retainer',
        addedOn: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'tx_groceries_blinkit',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_partner',
        type: 'outflow',
        amountPaise: 385000, // ₹3,850
        transactionDate: `${currentMonth}-04`,
        category: 'Groceries & Household',
        sourceOrMerchant: 'Blinkit Fresh Delivery',
        accountId: 'acc_icici_savings',
        owner: 'person2',
        notes: 'Weekly pantry restocking and fresh fruits',
        addedOn: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'tx_dining_rohan',
        userId: 'demo_user',
        workspaceId: 'ws_demo',
        createdBy: 'demo_user',
        type: 'outflow',
        amountPaise: 420000, // ₹4,200
        transactionDate: `${currentMonth}-06`,
        category: 'Dining & Cafes',
        sourceOrMerchant: 'Smoke House Deli',
        creditCardId: 'card_icici_amazon',
        owner: 'person1',
        notes: 'Weekend dinner with friends',
        addedOn: nowIso,
        updatedAt: nowIso,
      },
    ];

    setAccounts(sampleAccounts);
    setCategories(sampleCategories);
    setAssets(sampleAssets);
    setCreditCards(sampleCards);
    setStatements(sampleStatements);
    setLoans(sampleLoans);
    setInstallments(sampleInstallments);
    setTransactions(sampleTransactions);
  };

  const seedDemoWorkspace = async () => {
    seedDemoDataLocally();
    showSuccess('Loaded sample workspace with realistic separate and shared finances');
  };

  const clearWorkspace = async () => {
    if (!user) return;
    if (user.uid === 'demo_user') {
      localStorage.removeItem('moneydesk_demo_workspace');
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
      setLoans([]);
      setInstallments([]);
      setCreditCards([]);
      setStatements([]);
      setPayments([]);
      setAssets([]);
      showSuccess('Workspace reset to empty');
      return;
    }

    if (!activeWorkspaceId) return;
    try {
      const collectionsToClear = [
        'transactions',
        'accounts',
        'categories',
        'loans',
        'loan_installments',
        'credit_cards',
        'card_statements',
        'payments',
        'assets',
      ];

      for (const col of collectionsToClear) {
        const snap = await getDocs(collection(db, 'workspaces', activeWorkspaceId, col));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }
      showSuccess('Workspace reset to empty');
    } catch (err) {
      console.error(err);
      setLastError('Failed to clear workspace');
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        user,
        loadingAuth,
        signIn,
        signOut,
        continueAsDemo,
        workspace,
        workspaceMembers,
        workspaceInvites,
        currentMember,
        activeWorkspaceId,
        createInvite,
        revokeInvite,
        redeemInvite,
        removeMember,
        updateMemberLinkedProfile,
        switchWorkspace,
        pendingInviteToAccept,
        setPendingInviteToAccept,
        accounts,
        categories,
        transactions,
        loans,
        installments,
        creditCards,
        statements,
        payments,
        assets,
        person1Name,
        person2Name,
        updatePartnerNames,
        dashboardFilter,
        setDashboardFilter,
        selectedMonth,
        setSelectedMonth: (m) => startTransition(() => setSelectedMonth(m)),
        customDateRange,
        setCustomDateRange,
        activeTab,
        setActiveTab,
        addTransaction,
        editTransaction,
        deleteTransaction,
        addAccount,
        editAccount,
        deleteAccount,
        reconcileAccount,
        recordTransfer,
        getAccountBalance,
        addAsset,
        editAsset,
        deleteAsset,
        addCategory,
        deleteCategory,
        addLoan,
        editLoan,
        deleteLoan,
        addOrUpdateInstallment,
        addCreditCard,
        editCreditCard,
        deleteCreditCard,
        addCardStatement,
        editCardStatement,
        deleteCardStatement,
        recordPayment,
        deletePayment,
        seedDemoWorkspace,
        clearWorkspace,
        lastError,
        clearError,
        actionSuccess,
        loadingData,
        dataError,
        refreshData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
