"use client";

import { useMemo, useState, useEffect } from "react";
import { simulateWealthEngine } from "../calculator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMoney2(n: number) {
  if (!Number.isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatNumberWithCommas(raw: string) {
  // allows "", "-", ".", "-." while typing
  if (raw === "" || raw === "-" || raw === "." || raw === "-.") return raw;

  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return raw;

  // keep decimals if present in raw
  const hasDot = raw.includes(".");
  const decimals = hasDot ? raw.split(".")[1] ?? "" : "";

  const whole = Math.trunc(Math.abs(n));
  const wholeFormatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(whole);

  const sign = n < 0 ? "-" : "";

  if (!hasDot) return `${sign}${wholeFormatted}`;
  return `${sign}${wholeFormatted}.${decimals}`;
}

function parseNumber(raw: string) {
  const cleaned = raw.replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function isFilled(raw: string) {
  return raw.trim() !== "" && raw.trim() !== "-" && raw.trim() !== "." && raw.trim() !== "-.";
}

function CrossIcon() {
  // subtle inline svg (no deps)
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12 2v20M7 7h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Verse = { text: string; ref: string };

const VERSES: Verse[] = [
  { text: "Commit your work to the Lord, and your plans will be established.", ref: "Proverbs 16:3" },
  { text: "The plans of the diligent lead surely to abundance.", ref: "Proverbs 21:5" },
  { text: "If any of you lacks wisdom, let him ask God… who gives generously.", ref: "James 1:5" },
  { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
  { text: "One who is faithful in a very little is also faithful in much.", ref: "Luke 16:10" },
];

function Card({
  title,
  children,
  sub,
}: {
  title: string;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs text-gray-500">{title}</p>
      <div className="mt-1 text-2xl font-bold text-gray-900">{children}</div>
      {sub ? <p className="mt-2 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-900">{children}</h2>;
}

function CommaInput({
  label,
  value,
  onChange,
  helper,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helper?: string;
  placeholder?: string;
}) {
  const display = useMemo(() => formatNumberWithCommas(value), [value]);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-800">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        onChange={(e) => {
          // allow digits, commas, dot, minus
          const raw = e.target.value.replace(/[^\d,.\-]/g, "");
          // keep only first minus at start
          const normalized =
            raw.startsWith("-")
              ? "-" + raw.slice(1).replace(/-/g, "")
              : raw.replace(/-/g, "");
          // keep only first dot
          const parts = normalized.split(".");
          const withoutExtraDots =
            parts.length <= 2 ? normalized : parts[0] + "." + parts.slice(1).join("");
          onChange(withoutExtraDots);
        }}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-black focus:outline-none"
      />
      {helper ? <p className="text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}

export default function Home() {
  // core inputs
  const [homePrice, setHomePrice] = useState("");
  const [downPaymentPct, setDownPaymentPct] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termYears, setTermYears] = useState("");
  const [appreciationRate, setAppreciationRate] = useState("");
  const [yearsOwned, setYearsOwned] = useState("");

  // costs
  const [annualTax, setAnnualTax] = useState("");
  const [annualInsurance, setAnnualInsurance] = useState("");
  const [monthlyMisc, setMonthlyMisc] = useState("");

  // acceleration
  const [monthlyExtra, setMonthlyExtra] = useState("");
  const [lumpSum, setLumpSum] = useState("");

  // CTA + form
  const [showForm, setShowForm] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const requiredFilled =
    isFilled(homePrice) &&
    isFilled(downPaymentPct) &&
    isFilled(interestRate) &&
    isFilled(termYears) &&
    isFilled(appreciationRate) &&
    isFilled(yearsOwned);

  const anyAcceleration = (parseNumber(monthlyExtra) > 0) || (parseNumber(lumpSum) > 0);

const [verse, setVerse] = useState<Verse | null>(null);

useEffect(() => {
  const i = Math.floor(Math.random() * VERSES.length);
  setVerse(VERSES[i]);
}, []);

  const parsed = useMemo(() => {
    return {
      homePrice: parseNumber(homePrice),
      downPaymentPct: parseNumber(downPaymentPct) / 100,
      annualInterestRate: parseNumber(interestRate) / 100,
      termYears: parseNumber(termYears),
      annualAppreciationRate: parseNumber(appreciationRate) / 100,
      yearsOwned: parseNumber(yearsOwned),
      monthlyExtraPrincipal: Math.max(0, parseNumber(monthlyExtra)),
      lumpSumAtSnapshot: Math.max(0, parseNumber(lumpSum)),
      annualTax: Math.max(0, parseNumber(annualTax)),
      annualInsurance: Math.max(0, parseNumber(annualInsurance)),
      monthlyMisc: Math.max(0, parseNumber(monthlyMisc)),
    };
  }, [
    homePrice,
    downPaymentPct,
    interestRate,
    termYears,
    appreciationRate,
    yearsOwned,
    monthlyExtra,
    lumpSum,
    annualTax,
    annualInsurance,
    monthlyMisc,
  ]);

  const result = useMemo(() => {
    if (!parsed.homePrice || !parsed.termYears) return null;
    return simulateWealthEngine({
      homePrice: parsed.homePrice,
      downPaymentPct: parsed.downPaymentPct,
      annualInterestRate: parsed.annualInterestRate,
      termYears: parsed.termYears,
      annualAppreciationRate: parsed.annualAppreciationRate,
      yearsOwned: parsed.yearsOwned,
      monthlyExtraPrincipal: parsed.monthlyExtraPrincipal,
      lumpSumAtSnapshot: parsed.lumpSumAtSnapshot,
    });
  }, [parsed]);

  // All-in monthly cost
  const monthlyTax = parsed.annualTax / 12;
  const monthlyIns = parsed.annualInsurance / 12;
  const monthlyPI = result?.monthlyPI ?? 0;
  const allInMonthly = monthlyPI + monthlyTax + monthlyIns + parsed.monthlyMisc + parsed.monthlyExtraPrincipal;

  // P&I split at snapshot (accelerated) balance
  const rMonthly = parsed.annualInterestRate / 12;
  const balanceAtSnapshot = result?.accelerated?.balanceAtSnapshot ?? 0;
  const interestPortion = balanceAtSnapshot * rMonthly;
  const principalPortion = Math.max(0, monthlyPI - interestPortion);

  // Chart data
  const chartData = useMemo(() => {
    const base = result?.equityByYearBase ?? [];
    const accel = result?.equityByYearAccel ?? [];
    const years = Math.max(base.length, accel.length);

    const rows: Array<{ year: number; baseline: number; accelerated?: number }> = [];
    for (let i = 0; i < years; i++) {
      rows.push({
        year: i + 1,
        baseline: base[i] ?? 0,
        accelerated: accel[i] ?? 0,
      });
    }
    return rows;
  }, [result]);

  async function submitLead() {
    setFormStatus("sending");
    try {
      const payload = {
        name: leadName,
        email: leadEmail,
        phone: leadPhone,
        notes: leadNotes,
        calculatorData: {
          homePrice: parsed.homePrice,
          downPaymentPct: parseNumber(downPaymentPct),
          interestRatePct: parseNumber(interestRate),
          termYears: parsed.termYears,
          appreciationRatePct: parseNumber(appreciationRate),
          yearsOwned: parsed.yearsOwned,
          annualTax: parsed.annualTax,
          annualInsurance: parsed.annualInsurance,
          monthlyMisc: parsed.monthlyMisc,
          monthlyExtraPrincipal: parsed.monthlyExtraPrincipal,
          lumpSumAtSnapshot: parsed.lumpSumAtSnapshot,
          outputs: {
            equitySnapshot: result?.equityAtSnapshotAccel ?? 0,
            interestSaved: result?.interestSaved ?? 0,
            payoffYearsBaseline: result?.baseline?.payoffYears ?? 0,
            payoffYearsAccelerated: result?.accelerated?.payoffYears ?? 0,
            equityBoostAtSnapshot: result?.equityBoostAtSnapshot ?? 0,
          },
        },
      };

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Request failed");
      setFormStatus("sent");
    } catch {
      setFormStatus("error");
    } finally {
      setTimeout(() => setFormStatus("idle"), 2500);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Wealth Engine</h1>
          <p className="mt-1 text-sm text-gray-600">by Tustyn Yarger</p>
        </div>

        {/* Big 4 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card
  title={
    parsed.yearsOwned > 0
      ? `Total Equity After ${parsed.yearsOwned} Years`
      : "Total Equity"
  }
>
  {formatMoney(result?.equityAtSnapshotAccel ?? 0)}
</Card>

          <Card title="Home Value">
            {formatMoney(result?.homeValueAtSnapshot ?? 0)}
          </Card>

          <Card title="Monthly P&I">
            {formatMoney(result?.monthlyPI ?? 0)}
          </Card>

          <Card title="All-in Monthly Cost">
            {formatMoney(allInMonthly)}
            <span className="hidden" />
          </Card>
        </div>

        {/* CTA fades in */}
        <div className="mt-8 text-center">
          <div
            className={[
              "inline-block transform transition-all duration-500",
              requiredFilled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
            ].join(" ")}
          >
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-xl bg-black px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
            >
              Build My Custom Strategy
            </button>
            <p className="mt-2 text-xs text-gray-500">Personalized Ann Arbor plan.</p>
          </div>
        </div>

        {/* Lead form (only reveals after CTA) */}
        {showForm ? (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <SectionTitle>Request a custom plan</SectionTitle>
            <p className="mt-1 text-xs text-gray-500">
              Send your scenario and I’ll reply with next steps.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <CommaInput label="Name" value={leadName} onChange={setLeadName} placeholder="Your name" />
              <CommaInput label="Email" value={leadEmail} onChange={setLeadEmail} placeholder="you@gmail.com" />
              <CommaInput label="Phone (optional)" value={leadPhone} onChange={setLeadPhone} placeholder="(optional)" />
              <CommaInput label="Notes (optional)" value={leadNotes} onChange={setLeadNotes} placeholder="Any context..." />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={submitLead}
                className="rounded-xl bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
                disabled={!leadName.trim() || !leadEmail.trim() || formStatus === "sending"}
              >
                {formStatus === "sending" ? "Sending..." : "Send"}
              </button>

              {formStatus === "sent" ? (
                <span className="text-sm text-green-700">Sent.</span>
              ) : null}
              {formStatus === "error" ? (
                <span className="text-sm text-red-700">
                  Not sent (API not set up yet).
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <SectionTitle>Inputs</SectionTitle>

              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-800">Purchase & Loan</p>
                  <CommaInput label="Home Price" value={homePrice} onChange={setHomePrice} placeholder="e.g. 300,000" />
                  <CommaInput label="Down Payment (%)" value={downPaymentPct} onChange={setDownPaymentPct} helper="10 = 10%" />
                  <CommaInput label="Interest Rate (%)" value={interestRate} onChange={setInterestRate} helper="6 = 6%" />
                  <CommaInput label="Loan Term (Years)" value={termYears} onChange={setTermYears} placeholder="e.g. 30" />
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-800">Ownership</p>
                  <CommaInput label="Annual Appreciation (%)" value={appreciationRate} onChange={setAppreciationRate} helper="4 = 4%" />
                  <CommaInput label="Years Owned" value={yearsOwned} onChange={setYearsOwned} placeholder="e.g. 10" />
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-800">Costs</p>
                  <CommaInput label="Property Tax (Annual)" value={annualTax} onChange={setAnnualTax} helper="e.g. 5,000" />
                  <CommaInput label="Insurance (Annual)" value={annualInsurance} onChange={setAnnualInsurance} helper="e.g. 1,200" />
                  <CommaInput label="Monthly Misc" value={monthlyMisc} onChange={setMonthlyMisc} helper="e.g. 300" />
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-800">Acceleration (Optional)</p>
                  <CommaInput label="Extra Principal (Monthly)" value={monthlyExtra} onChange={setMonthlyExtra} helper="e.g. 200" />
                  <CommaInput label="Lump Sum (Applied at Years Owned)" value={lumpSum} onChange={setLumpSum} helper="e.g. 10,000" />
                </div>
              </div>
            </div>
          </div>

          {/* Outputs */}
          <div className="lg:col-span-3 space-y-6">
            {/* Monthly breakdown */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <SectionTitle>Monthly Breakdown</SectionTitle>

              <div className="mt-6 rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">All-in monthly cost</p>

                <div className="mt-3 grid gap-3 md:grid-cols-5">
                  <div>
                    <p className="text-xs text-gray-500">P&I</p>
                    <p className="font-semibold text-gray-900">{formatMoney2(monthlyPI)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Taxes</p>
                    <p className="font-semibold text-gray-900">{formatMoney2(monthlyTax)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Insurance</p>
                    <p className="font-semibold text-gray-900">{formatMoney2(monthlyIns)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Misc</p>
                    <p className="font-semibold text-gray-900">{formatMoney2(parsed.monthlyMisc)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Extra</p>
                    <p className="font-semibold text-gray-900">{formatMoney2(parsed.monthlyExtraPrincipal)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">{formatMoney2(allInMonthly)}</p>
                </div>
              </div>
            </div>

            {/* Payoff / savings */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <SectionTitle>Acceleration Impact</SectionTitle>
<div className="mt-6 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
  <p className="text-xs text-gray-500">
    Total Principal Paid (After {parsed.yearsOwned || 0} Years)
  </p>
  <p className="mt-1 text-lg font-semibold text-gray-900">
    {formatMoney(
      anyAcceleration
        ? result?.accelerated?.principalPaidAtSnapshot ?? 0
        : result?.baseline?.principalPaidAtSnapshot ?? 0
    )}
  </p>
</div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs text-gray-500">Baseline payoff</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {(result?.baseline?.payoffYears ?? 0).toFixed(1)} years
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs text-gray-500">Accelerated payoff</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {(result?.accelerated?.payoffYears ?? 0).toFixed(1)} years
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs text-gray-500">Years saved</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {(result?.payoffYearsSaved ?? 0).toFixed(1)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs text-gray-500">Interest saved</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatMoney(result?.interestSaved ?? 0)}
                  </p>
                </div>
              </div>

              <div className="mt-5 text-sm text-gray-600">
  Additional Equity From Extra Payments:{" "}
  <span className="font-semibold text-gray-900">
    {formatMoney(result?.equityBoostAtSnapshot ?? 0)}
  </span>
</div>
            </div>

            {/* Chart */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="flex items-end justify-between gap-4">
                <SectionTitle>Equity Over Time</SectionTitle>
                <p className="text-xs text-gray-500">
                  Baseline {anyAcceleration ? "vs accelerated" : ""}
                </p>
              </div>

              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("en-US", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(v)
                      }
                    />
                    <Tooltip
                      formatter={(v: any) => formatMoney(Number(v))}
                      labelFormatter={(l) => `Year ${l}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="baseline"
                      strokeWidth={2}
                      dot={false}
                    />
                    {anyAcceleration ? (
                      <Line
                        type="monotone"
                        dataKey="accelerated"
                        strokeWidth={2}
                        dot={false}
                      />
                    ) : null}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Tip: Add extra principal or a lump sum to see the accelerated line.
              </p>
            </div>

            {/* Faith signature */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="flex items-start gap-3 text-gray-700">
                <div className="mt-0.5 text-gray-400">
                  <CrossIcon />
                </div>
                <div>
                  {verse ? (
  <>
    <p className="text-sm text-gray-700">“{verse.text}”</p>
    <p className="mt-1 text-xs text-gray-500">— {verse.ref}</p>
  </>
) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-gray-500">
          Tustyn Yarger | Reinhart Realtors | The Cadence Group
        </footer>
      </div>
    </div>
  );
}