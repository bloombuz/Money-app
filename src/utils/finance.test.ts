import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatINR,
  parseINRToPaise,
  evaluatePaymentStatus,
  calculateNewLoanBalance,
  calculateCreditCardMetrics,
  getPreviousMonthString,
  getNextMonthString,
} from './finance';

test('formatINR formats numbers according to Indian system', () => {
  assert.equal(formatINR(0), '₹0');
  assert.equal(formatINR(50000), '₹500'); // 500.00
  assert.equal(formatINR(50050), '₹500.50');
  assert.equal(formatINR(10000000), '₹1,00,000'); // 1 Lakh
  assert.equal(formatINR(123456789), '₹12,34,567.89');
  assert.equal(formatINR(-50000), '-₹500');
});

test('parseINRToPaise safely converts rupees to integer paise', () => {
  assert.equal(parseINRToPaise(100), 10000);
  assert.equal(parseINRToPaise('100.50'), 10050);
  assert.equal(parseINRToPaise('₹ 1,23,456.75'), 12345675);
  assert.equal(parseINRToPaise(''), 0);
});

test('evaluatePaymentStatus correctly evaluates overdue, due today, paid, and partially paid', () => {
  const today = '2026-11-09';
  // Full payment
  assert.equal(evaluatePaymentStatus(100000, 100000, '2026-11-10', today), 'paid');
  // Overpayment
  assert.equal(evaluatePaymentStatus(100000, 120000, '2026-11-05', today), 'paid');
  // Partial payment
  assert.equal(evaluatePaymentStatus(100000, 50000, '2026-11-05', today), 'partially_paid');
  assert.equal(evaluatePaymentStatus(100000, 50000, '2026-11-15', today), 'partially_paid');
  // Due today
  assert.equal(evaluatePaymentStatus(100000, 0, today, today), 'due_today');
  // Overdue
  assert.equal(evaluatePaymentStatus(100000, 0, '2026-11-08', today), 'overdue');
  // Upcoming
  assert.equal(evaluatePaymentStatus(100000, 0, '2026-11-15', today), 'upcoming');
});

test('calculateNewLoanBalance only reduces loan balance by principal portion', () => {
  const currentLoanPrincipal = 50000000; // ₹5,00,000
  const principalPaid = 1500000; // ₹15,000
  const remaining = calculateNewLoanBalance(currentLoanPrincipal, principalPaid);
  assert.equal(remaining, 48500000); // ₹4,85,000
});

test('calculateCreditCardMetrics correctly splits current balance, billed and unbilled spending', () => {
  const metrics = calculateCreditCardMetrics({
    openingBalancePaise: 2000000, // ₹20,000 opening
    reconciliationAdjustmentPaise: 0,
    purchasesPaise: 1500000, // +₹15,000 new purchases
    paymentsPaise: 1000000, // -₹10,000 payment made
    unpaidStatementsRemainingPaise: 1000000, // ₹10,000 remaining on billed statement
  });

  // Current balance = 20,000 + 15,000 - 10,000 = 25,000 (2500000 paise)
  assert.equal(metrics.currentOutstandingPaise, 2500000);
  // Billed still due = 10,000 (1000000 paise)
  assert.equal(metrics.billedAmountStillDuePaise, 1000000);
  // Unbilled = 25,000 - 10,000 = 15,000 (1500000 paise)
  assert.equal(metrics.newUnbilledSpendingPaise, 1500000);
});

test('month calculation helpers move forward and backward across year boundaries', () => {
  assert.equal(getPreviousMonthString('2026-01'), '2025-12');
  assert.equal(getPreviousMonthString('2026-11'), '2026-10');
  assert.equal(getNextMonthString('2026-12'), '2027-01');
  assert.equal(getNextMonthString('2026-10'), '2026-11');
});
