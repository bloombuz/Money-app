import { Transaction, Account, CreditCard } from '../types';
import { formatINR } from './finance';

export function exportTransactionsToCSV(
  transactions: Transaction[],
  accounts: Account[],
  creditCards: CreditCard[],
  filename = 'money-desk-transactions.csv'
) {
  const getAccountOrCardName = (tx: Transaction) => {
    if (tx.creditCardId) {
      const card = creditCards.find((c) => c.id === tx.creditCardId);
      return card ? `${card.nickname} (${card.issuer})` : 'Credit Card';
    }
    if (tx.accountId) {
      const acc = accounts.find((a) => a.id === tx.accountId);
      return acc ? acc.name : 'Account';
    }
    return '-';
  };

  const headers = [
    'Transaction Date',
    'Type',
    'Source / Merchant',
    'Category',
    'Payment Account / Card',
    'Amount (₹)',
    'Amount (Paise)',
    'Debt/Card Payment?',
    'Added On',
    'Notes',
  ];

  const rows = transactions.map((tx) => [
    `"${tx.transactionDate}"`,
    `"${tx.type}"`,
    `"${(tx.sourceOrMerchant || '').replace(/"/g, '""')}"`,
    `"${(tx.category || '').replace(/"/g, '""')}"`,
    `"${getAccountOrCardName(tx).replace(/"/g, '""')}"`,
    `"${(tx.amountPaise / 100).toFixed(2)}"`,
    `"${tx.amountPaise}"`,
    `"${tx.isDebtPayment ? 'Yes' : 'No'}"`,
    `"${tx.addedOn}"`,
    `"${(tx.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
