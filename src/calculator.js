// calculator.js
// Full amortization simulator with:
// - baseline + accelerated scenarios
// - monthly extra principal
// - lump sum applied at snapshot (yearsOwned)
// - payoff months, total interest, interest saved
// - equity by year arrays for charting

function monthlyPaymentPI(loanAmount, annualInterestRate, termYears) {
  const r = annualInterestRate / 12;
  const n = termYears * 12;

  if (loanAmount <= 0 || n <= 0) return 0;

  // 0% interest
  if (r === 0) return loanAmount / n;

  const pow = Math.pow(1 + r, n);
  return (loanAmount * (r * pow)) / (pow - 1);
}

/**
 * Simulates month-by-month amortization and returns rich metrics.
 *
 * @param {Object} opts
 * @param {number} opts.loanAmount
 * @param {number} opts.annualInterestRate decimal (0.06 = 6%)
 * @param {number} opts.termYears
 * @param {number} opts.monthlyExtraPrincipal extra principal paid monthly (>= 0)
 * @param {number} opts.lumpSumAtSnapshot applied once at snapshot month (>= 0)
 * @param {number} opts.snapshotMonths month index where lump sum is applied (k). Example: yearsOwned*12
 * @returns {Object}
 */
function simulateAmortization({
  loanAmount,
  annualInterestRate,
  termYears,
  monthlyExtraPrincipal = 0,
  lumpSumAtSnapshot = 0,
  snapshotMonths = 0,
}) {
  const r = annualInterestRate / 12;
  const scheduledPI = monthlyPaymentPI(loanAmount, annualInterestRate, termYears);
  const maxMonths = termYears * 12;

  let balance = loanAmount;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let payoffMonths = 0;

  // Track arrays by year for charting (end-of-year snapshots)
  const equityPrincipalByYear = []; // cumulative principal paid by end of each year
  const balanceByYear = []; // remaining balance by end of each year

  // Track snapshot (at yearsOwned)
  let principalPaidAtSnapshot = 0;
  let balanceAtSnapshot = balance;
  let interestPaidAtSnapshot = 0;

  // Safety: if user enters crazy extra, don't infinite loop
  const hardCapMonths = 2000;

  for (let m = 1; m <= hardCapMonths; m++) {
    if (balance <= 0) {
      payoffMonths = m - 1;
      break;
    }

    // If we reach scheduled term and still have balance, still keep going (rare edge)
    // but the scheduledPI might not be enough if rate is weird — still okay.

    // Interest for this month
    const interest = balance * r;
    totalInterest += interest;

    // Scheduled principal portion
    let principal = scheduledPI - interest;

    // If interest >= payment (can happen if payment too small due to malformed inputs),
    // prevent negative principal.
    if (principal < 0) principal = 0;

    // Add extra principal
    const extra = Math.max(0, monthlyExtraPrincipal);
    principal += extra;

    // Cap principal so we don't pay below zero
    if (principal > balance) principal = balance;

    balance -= principal;
    totalPrincipal += principal;

    // Apply lump sum exactly at snapshot month AFTER the regular monthly payment
    // (this matches "at the time of the snapshot" concept)
    if (m === Math.max(0, Math.round(snapshotMonths)) && lumpSumAtSnapshot > 0 && balance > 0) {
      const lump = Math.min(balance, Math.max(0, lumpSumAtSnapshot));
      balance -= lump;
      totalPrincipal += lump; // lump is principal paid
      // Note: lump does not add interest
    }

    // Snapshot capture at exactly snapshot month
    if (m === Math.max(0, Math.round(snapshotMonths))) {
      principalPaidAtSnapshot = totalPrincipal;
      balanceAtSnapshot = balance;
      interestPaidAtSnapshot = totalInterest;
    }

    // End-of-year tracking (m = 12, 24, 36, ...)
    if (m % 12 === 0) {
      equityPrincipalByYear.push(totalPrincipal);
      balanceByYear.push(balance);
    }

    // If we hit the scheduled term and loan is paid, we still break above
    if (m >= maxMonths && balance <= 0) {
      payoffMonths = m;
      break;
    }

    // If we exceed scheduled term but still have balance, keep going until paid off
    payoffMonths = m;
  }

  // If snapshotMonths is 0, define "snapshot" as month 0 (no payments made)
  if (!snapshotMonths || snapshotMonths <= 0) {
    principalPaidAtSnapshot = 0;
    balanceAtSnapshot = loanAmount;
    interestPaidAtSnapshot = 0;
  }

  return {
    scheduledPI,
    payoffMonths,
    totalInterest,
    totalPrincipalPaid: totalPrincipal,

    // snapshot metrics
    principalPaidAtSnapshot,
    balanceAtSnapshot,
    interestPaidAtSnapshot,

    // charting arrays (one entry per year completed)
    equityPrincipalByYear,
    balanceByYear,
  };
}

/**
 * Main engine: baseline + accelerated simulations + home appreciation + equity
 *
 * Inputs:
 * - downPaymentPct, annualInterestRate, annualAppreciationRate are decimals
 * - monthlyExtraPrincipal and lumpSum are dollars
 */
function simulateWealthEngine({
  homePrice,
  downPaymentPct, // decimal (0.10 = 10%)
  annualInterestRate, // decimal (0.06 = 6%)
  termYears,
  annualAppreciationRate, // decimal (0.04 = 4%)
  yearsOwned,

  // new
  monthlyExtraPrincipal = 0,
  lumpSumAtSnapshot = 0,
}) {
  const downPayment = homePrice * downPaymentPct;
  const loanAmount = homePrice - downPayment;

  const snapshotMonths = Math.max(0, Math.round(yearsOwned * 12));

  // Baseline sim (no extra payments, no lump sum)
  const base = simulateAmortization({
    loanAmount,
    annualInterestRate,
    termYears,
    monthlyExtraPrincipal: 0,
    lumpSumAtSnapshot: 0,
    snapshotMonths,
  });

  // Accelerated sim
  const accel = simulateAmortization({
    loanAmount,
    annualInterestRate,
    termYears,
    monthlyExtraPrincipal: Math.max(0, monthlyExtraPrincipal),
    lumpSumAtSnapshot: Math.max(0, lumpSumAtSnapshot),
    snapshotMonths,
  });

  // Home value growth at snapshot
  const homeValueAtSnapshot =
    homePrice * Math.pow(1 + annualAppreciationRate, yearsOwned);

  const totalAppreciationAtSnapshot = homeValueAtSnapshot - homePrice;

  // Equity at snapshot:
  // down payment + principal paid by snapshot + appreciation by snapshot
  const equityAtSnapshotBase =
    downPayment + base.principalPaidAtSnapshot + totalAppreciationAtSnapshot;

  const equityAtSnapshotAccel =
    downPayment + accel.principalPaidAtSnapshot + totalAppreciationAtSnapshot;

  // Build chart-ready equity-by-year arrays (equity = downPayment + principalPaid + appreciationByYear)
  // We'll align years 1..N where N = max years shown. For appreciation, compute per year.
  const maxYearsShown = Math.max(
    base.equityPrincipalByYear.length,
    accel.equityPrincipalByYear.length,
    Math.ceil(yearsOwned)
  );

  function appreciationAtYear(y) {
    return homePrice * Math.pow(1 + annualAppreciationRate, y) - homePrice;
  }

  const equityByYearBase = [];
  const equityByYearAccel = [];

  for (let y = 1; y <= maxYearsShown; y++) {
    const principalBase = base.equityPrincipalByYear[y - 1] ?? base.totalPrincipalPaid;
    const principalAccel = accel.equityPrincipalByYear[y - 1] ?? accel.totalPrincipalPaid;
    const appr = appreciationAtYear(y);

    equityByYearBase.push(downPayment + principalBase + appr);
    equityByYearAccel.push(downPayment + principalAccel + appr);
  }

  // Interest savings + payoff time savings
  const interestSaved = base.totalInterest - accel.totalInterest;
  const payoffMonthsSaved = base.payoffMonths - accel.payoffMonths;

  return {
    // Inputs-derived
    downPayment,
    loanAmount,

    // Snapshot home value
    homeValueAtSnapshot,
    totalAppreciationAtSnapshot,

    // Monthly payment (scheduled P&I, same for both)
    monthlyPI: base.scheduledPI,

    // Snapshot equity
    equityAtSnapshotBase,
    equityAtSnapshotAccel,
    equityBoostAtSnapshot: equityAtSnapshotAccel - equityAtSnapshotBase,

    // Payoff + interest metrics
    baseline: {
      payoffMonths: base.payoffMonths,
      payoffYears: base.payoffMonths / 12,
      totalInterest: base.totalInterest,
      principalPaidAtSnapshot: base.principalPaidAtSnapshot,
      balanceAtSnapshot: base.balanceAtSnapshot,
    },
    accelerated: {
      payoffMonths: accel.payoffMonths,
      payoffYears: accel.payoffMonths / 12,
      totalInterest: accel.totalInterest,
      principalPaidAtSnapshot: accel.principalPaidAtSnapshot,
      balanceAtSnapshot: accel.balanceAtSnapshot,
    },
    interestSaved,
    payoffMonthsSaved,
    payoffYearsSaved: payoffMonthsSaved / 12,

    // Chart data
    equityByYearBase,
    equityByYearAccel,
  };
}

/* ===========================
   TEST RUN (prints in Terminal)
   =========================== */

const result = simulateWealthEngine({
  homePrice: 300000,
  downPaymentPct: 0.1,
  annualInterestRate: 0.06,
  termYears: 30,
  annualAppreciationRate: 0.04,
  yearsOwned: 10,

  monthlyExtraPrincipal: 250,   // try 0, 250, 500
  lumpSumAtSnapshot: 10000,     // try 0, 10000, 50000
});

console.log(result);

// Export for Next.js usage if you want to import this file later
module.exports = { simulateWealthEngine };