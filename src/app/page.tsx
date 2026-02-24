"use client";

import { useMemo, useState } from "react";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPct(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(n);
}

function calcEquity(input: {
  homePrice: number;
  downPaymentPct: number; // decimal (0.10 = 10%)
  annualInterestRate: number; // decimal (0.06 = 6%)
  termYears: number;
  annualAppreciationRate: number; // decimal (0.04 = 4%)
  yearsOwned: number;
  annualTax: number;
  annualInsurance: number;
  monthlyMisc: number;
}) {
  const {
    homePrice,
    downPaymentPct,
    annualInterestRate,
    termYears,
    annualAppreciationRate,
    yearsOwned,
    annualTax,
    annualInsurance,
    monthlyMisc,
  } = input;

  const downPayment = homePrice * downPaymentPct;
  const loanAmount = homePrice - downPayment;

  const r = annualInterestRate / 12;
  const n = termYears * 12;
  const k = Math.round(yearsOwned * 12);

  const pow = Math.pow(1 + r, n);
  const monthlyPI = loanAmount * (r * pow) / (pow - 1);

  let balance = loanAmount;
  let totalPrincipalPaid = 0;

  for (let i = 0; i < k; i++) {
    const interest = balance * r;
    const principal = monthlyPI - interest;
    totalPrincipalPaid += principal;
    balance -= principal;
    if (balance < 0) balance = 0;
  }

  const homeValue = homePrice * Math.pow(1 + annualAppreciationRate, yearsOwned);
  const totalAppreciation = homeValue - homePrice;
  const totalEquity = downPayment + totalPrincipalPaid + totalAppreciation;

  const monthlyTax = annualTax / 12;
  const monthlyIns = annualInsurance / 12;
  const totalMonthlyCostBuy = monthlyPI + monthlyTax + monthlyIns + monthlyMisc;
  const annualCostBuy = totalMonthlyCostBuy * 12;

  return {
    downPayment,
    loanAmount,
    monthlyPI,
    monthlyTax,
    monthlyIns,
    monthlyMisc,
    totalMonthlyCostBuy,
    annualCostBuy,
    totalPrincipalPaid,
    homeValue,
    totalAppreciation,
    totalEquity,
  };
}

function NumInput(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  helper?: string;
}) {
  const { label, value, onChange, step = 1, min, helper } = props;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-800">{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-black focus:outline-none"
      />
      {helper ? <p className="text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}

export default function Home() {
  // Inputs (matches your sheet style)
  const [homePrice, setHomePrice] = useState(300000);
  const [downPaymentPct, setDownPaymentPct] = useState(10); // user-friendly percent
  const [annualInterestRate, setAnnualInterestRate] = useState(6); // user-friendly percent
  const [termYears, setTermYears] = useState(30);
  const [annualAppreciationRate, setAnnualAppreciationRate] = useState(4); // user-friendly percent
  const [yearsOwned, setYearsOwned] = useState(10);

  const [annualTax, setAnnualTax] = useState(5000);
  const [annualInsurance, setAnnualInsurance] = useState(1200);
  const [monthlyMisc, setMonthlyMisc] = useState(270);

  const result = useMemo(() => {
    return calcEquity({
      homePrice,
      downPaymentPct: downPaymentPct / 100,
      annualInterestRate: annualInterestRate / 100,
      termYears,
      annualAppreciationRate: annualAppreciationRate / 100,
      yearsOwned,
      annualTax,
      annualInsurance,
      monthlyMisc,
    });
  }, [
    homePrice,
    downPaymentPct,
    annualInterestRate,
    termYears,
    annualAppreciationRate,
    yearsOwned,
    annualTax,
    annualInsurance,
    monthlyMisc,
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Owner Equity (OE) Calculator
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Transparent inputs + real-time outputs (principal paydown + appreciation).
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            Years owned: <span className="font-semibold text-gray-900">{yearsOwned}</span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-xs text-gray-500">Total Equity</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(result.totalEquity)}</p>
            <p className="mt-2 text-xs text-gray-500">
              {formatMoney(result.downPayment)} down + {formatMoney(result.totalPrincipalPaid)} principal +{" "}
              {formatMoney(result.totalAppreciation)} appreciation
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-xs text-gray-500">Home Value</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(result.homeValue)}</p>
            <p className="mt-2 text-xs text-gray-500">Appreciation: {formatMoney(result.totalAppreciation)}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-xs text-gray-500">Monthly P&amp;I</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(result.monthlyPI)}</p>
            <p className="mt-2 text-xs text-gray-500">
              Loan: {formatMoney(result.loanAmount)} • DP: {formatPct(downPaymentPct / 100)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-xs text-gray-500">All-in Monthly Cost (Buy)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(result.totalMonthlyCostBuy)}</p>
            <p className="mt-2 text-xs text-gray-500">Annual: {formatMoney(result.annualCostBuy)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Inputs</h2>
              <p className="mt-1 text-xs text-gray-500">These match your spreadsheet assumptions.</p>

              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-800">Purchase &amp; Loan</p>
                  <NumInput label="Home Price" value={homePrice} onChange={setHomePrice} step={1000} min={0} />
                  <NumInput
                    label="Down Payment (%)"
                    value={downPaymentPct}
                    onChange={setDownPaymentPct}
                    step={0.25}
                    min={0}
                    helper="Example: 10 = 10%"
                  />
                  <NumInput
                    label="Interest Rate (%)"
                    value={annualInterestRate}
                    onChange={setAnnualInterestRate}
                    step={0.125}
                    min={0}
                    helper="Example: 6 = 6%"
                  />
                  <NumInput label="Loan Term (Years)" value={termYears} onChange={setTermYears} step={1} min={1} />
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-800">Ownership Assumptions</p>
                  <NumInput
                    label="Annual Appreciation (%)"
                    value={annualAppreciationRate}
                    onChange={setAnnualAppreciationRate}
                    step={0.25}
                    min={-50}
                    helper="Example: 4 = 4%"
                  />
                  <NumInput label="Years Owned" value={yearsOwned} onChange={setYearsOwned} step={1} min={0} />
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-800">Monthly / Annual Costs</p>
                  <NumInput label="Property Tax (Annual)" value={annualTax} onChange={setAnnualTax} step={100} min={0} />
                  <NumInput
                    label="Insurance (Annual)"
                    value={annualInsurance}
                    onChange={setAnnualInsurance}
                    step={50}
                    min={0}
                  />
                  <NumInput label="Monthly Misc" value={monthlyMisc} onChange={setMonthlyMisc} step={10} min={0} />
                </div>
              </div>
            </div>
          </div>

          {/* Transparent outputs */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Outputs (Transparent)</h2>
              <p className="mt-1 text-xs text-gray-500">
                This shows each component so it’s obvious where the “equity” number comes from.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs text-gray-500">Down Payment</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{formatMoney(result.downPayment)}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs text-gray-500">Principal Paid (Cumulative)</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{formatMoney(result.totalPrincipalPaid)}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs text-gray-500">Appreciation (Cumulative)</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{formatMoney(result.totalAppreciation)}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs text-gray-500">Total Equity</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{formatMoney(result.totalEquity)}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">All-in Monthly Cost Breakdown</p>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">P&amp;I</p>
                    <p className="font-semibold text-gray-900">{formatMoney(result.monthlyPI)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Taxes</p>
                    <p className="font-semibold text-gray-900">{formatMoney(result.monthlyTax)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Insurance</p>
                    <p className="font-semibold text-gray-900">{formatMoney(result.monthlyIns)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Misc</p>
                    <p className="font-semibold text-gray-900">{formatMoney(result.monthlyMisc)}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">{formatMoney(result.totalMonthlyCostBuy)}</p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Next step after this: add a chart (equity over time) + save/share scenarios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}