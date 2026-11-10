/**
 * Pure financial calculations and formatting for Money Desk.
 * Uses integer paise everywhere to eliminate IEEE-754 floating point issues.
 */

export type PaymentStatus = 'upcoming' | 'due_today' | 'partially_paid' | 'paid' | 'overdue';

/**
 * Format integer paise into Indian Rupee currency string: ₹1,23,456 or ₹1,23,456.50
 */
export function formatINR(paise: number, includeDecimalsIfZero = false): string {
  if (isNaN(paise) || paise === null || paise === undefined) return '₹0';
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Indian number system formatting: last 3 digits, then groups of 2
  const s = rupees.toString();
  let result = '';
  if (s.length <= 3) {
    result = s;
  } else {
    const lastThree = s.slice(-3);
    const rest = s.slice(0, -3);
    const formattedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${formattedRest},${lastThree}`;
  }

  let decimalPart = '';
  if (remainderPaise > 0 || includeDecimalsIfZero) {
    decimalPart = `.${remainderPaise.toString().padStart(2, '0')}`;
  }

  return `${isNegative ? '-' : ''}₹${result}${decimalPart}`;
}

/**
 * Safely parse rupee input string or number to integer paise.
 */
export function parseINRToPaise(value: string | number): number {
  if (typeof value === 'number') {
    if (isNaN(value)) return 0;
    return Math.round(value * 100);
  }
  if (!value) return 0;
  // Clean out currency symbols, commas, whitespace
  const clean = value.replace(/[^\d.-]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Determine payment status for loan EMI or credit card statement given due date and amounts.
 */
export function evaluatePaymentStatus(
  scheduledPaise: number,
  paidPaise: number,
  dueDate: string,
  todayDate: string
): PaymentStatus {
  if (paidPaise >= scheduledPaise && scheduledPaise > 0) {
    return 'paid';
  }
  if (paidPaise > 0 && paidPaise < scheduledPaise) {
    return 'partially_paid';
  }
  if (dueDate < todayDate) {
    return 'overdue';
  }
  if (dueDate === todayDate) {
    return 'due_today';
  }
  return 'upcoming';
}

/**
 * Calculate loan balance after payment with principal portion.
 * Only the principal component reduces the loan balance.
 */
export function calculateNewLoanBalance(
  currentBalancePaise: number,
  principalPaidPaise: number
): number {
  return Math.max(0, currentBalancePaise - Math.max(0, principalPaidPaise));
}

export interface CardCalculationInput {
  openingBalancePaise: number;
  reconciliationAdjustmentPaise?: number;
  // Purchases made on this card
  purchasesPaise: number;
  // Payments made toward this card
  paymentsPaise: number;
  // Unpaid statements total remaining
  unpaidStatementsRemainingPaise: number;
}

export interface CardCalculationResult {
  currentOutstandingPaise: number;
  billedAmountStillDuePaise: number;
  newUnbilledSpendingPaise: number;
}

/**
 * Calculates current card outstanding, billed amount still due, and new unbilled spending.
 * Avoids double-counting statement debt and purchases.
 */
export function calculateCreditCardMetrics(input: CardCalculationInput): CardCalculationResult {
  const currentOutstanding =
    input.openingBalancePaise +
    (input.reconciliationAdjustmentPaise || 0) +
    input.purchasesPaise -
    input.paymentsPaise;

  const billedAmountStillDue = Math.max(0, input.unpaidStatementsRemainingPaise);
  // Unbilled is whatever is outstanding minus what is already billed and still due
  const newUnbilledSpending = Math.max(0, currentOutstanding - billedAmountStillDue);

  return {
    currentOutstandingPaise: Math.max(0, currentOutstanding),
    billedAmountStillDuePaise: billedAmountStillDue,
    newUnbilledSpendingPaise: newUnbilledSpending,
  };
}

/**
 * Get date string YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getKolkataDateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Get current month string YYYY-MM in Asia/Kolkata timezone.
 */
export function getKolkataMonthString(d: Date = new Date()): string {
  return getKolkataDateString(d).slice(0, 7);
}

/**
 * Get previous month string YYYY-MM given a YYYY-MM string.
 */
export function getPreviousMonthString(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Get next month string YYYY-MM given a YYYY-MM string.
 */
export function getNextMonthString(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Format YYYY-MM into human friendly "November 2026"
 */
export function formatMonthName(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Formats ISO or date string to readable format with time in Asia/Kolkata.
 */
export function formatDateTimeKolkata(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Formats YYYY-MM-DD or ISO string to readable "12 Nov 2026" in Asia/Kolkata.
 */
export function formatDateKolkata(dateString: string): string {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Get human-readable owner label given the custom names.
 */
export function getOwnerLabel(
  owner: string | undefined | null,
  person1Name: string = 'Me',
  person2Name: string = 'My girlfriend'
): string {
  if (owner === 'person1') return person1Name || 'Me';
  if (owner === 'person2') return person2Name || 'My girlfriend';
  return 'Unassigned';
}

