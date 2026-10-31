import { useEffect, useState } from 'react';
import { adminSignIn, adminSignOut, buildCsv, loadSignups, type SignupsResponse } from '@/lib/signups';
import { Download, LogOut, Shield } from 'lucide-react';

const LABELS: Record<string, string> = {
  student: 'Student', professional: 'Working professional', commuter: 'Daily commuter', parent: 'Parent / guardian', other: 'Other',
  definitely: 'Definitely interested', probably: 'Probably interested', unsure: 'Not sure yet', probably_not: 'Probably not',
  good_value: 'Good value', reasonable: 'Reasonable', slightly_high: 'A little high', too_high: 'Too high', cant_say: 'Hard to say yet',
  sos: 'One-press SOS alert', emergency_contacts: 'Emergency contact messaging', location_sharing: 'Smartphone-assisted location sharing',
  discreet_design: 'Compact, discreet design', affordability: 'Overall affordability',
  not_answered: 'Not answered (earlier signups)',
};
const label = (value: string | null) => (value ? LABELS[value] ?? value : '—');

const SUMMARY_TITLES: Array<[keyof SignupsResponse['summary'], string]> = [
  ['purchaseInterest', 'Would consider buying at ₹2,600'],
  ['priceFeeling', 'How the price feels'],
  ['priorityFeature', 'Most valued feature'],
  ['audience', 'Who is signing up'],
];

export default function AdminPage() {
  const [data, setData] = useState<SignupsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Admin — NURIN';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, nofollow');
  }, []);

  async function load() {
    setError('');
    setLoading(true);
    try {
      await adminSignIn();
      setData(await loadSignups());
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'permission-denied') {
        setError('This Google account is not allowed to view signups.');
        await adminSignOut().catch(() => undefined);
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') setError('Sign-in was cancelled.');
      else if (code === 'auth/popup-blocked') setError('Your browser blocked the sign-in pop-up. Please allow pop-ups and try again.');
      else if (code === 'auth/unauthorized-domain') setError('This website address is not authorised in Firebase Authentication settings.');
      else setError('Could not load submissions.');
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    setError('');
    try {
      if (!data) return;
      const url = URL.createObjectURL(new Blob([buildCsv(data.signups)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `safety-bestie-signups-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('CSV export failed.');
    }
  }

  function signOut() {
    setData(null);
    void adminSignOut();
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAF9F6] text-[#292D27]">
      <header className="border-b border-[#292D27]/10">
        <div className="section-wrap flex h-[68px] items-center justify-between">
          <span className="flex items-center gap-2 text-[15px] font-bold tracking-[.19em]">
            <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-[#657153] text-[#FAF9F6]"><Shield size={14} aria-hidden="true" /></span>
            NURIN <span className="eyebrow ml-2 text-[#657153]">Admin</span>
          </span>
          {data && (
            <button onClick={signOut} className="secondary-button min-h-[40px] px-4 text-[11px]" data-testid="button-admin-signout">
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          )}
        </div>
      </header>

      <main className="section-wrap py-12">
        {!data ? (
          <div className="mx-auto max-w-[460px]" data-testid="form-admin-login">
            <h1 className="serif text-4xl tracking-[-.035em]">Signups</h1>
            <p className="mt-3 text-sm leading-6 text-[#62645C]">Private. Sign in with the admin Google account to view the people who joined the early-access list.</p>
            {error && <p role="alert" className="mt-4 border-l-2 border-[#9A443D] bg-[#F7EDEA] px-4 py-3 text-sm text-[#70332D]" data-testid="status-admin-error">{error}</p>}
            <button type="button" onClick={() => void load()} disabled={loading} className="primary-button mt-6 w-full" data-testid="button-admin-login">{loading ? 'Checking…' : 'Sign in with Google'}</button>
          </div>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 className="serif text-4xl tracking-[-.035em]">Signups</h1>
                <p className="mt-2 text-sm text-[#62645C]" data-testid="text-admin-total">{data.total} {data.total === 1 ? 'person has' : 'people have'} registered interest.{data.truncated && ' Showing the most recent 5,000 — use the CSV for the full list.'}</p>
              </div>
              <button onClick={downloadCsv} className="primary-button" data-testid="button-admin-csv"><Download size={15} aria-hidden="true" /> Download CSV</button>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-[#70332D]">{error}</p>}

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SUMMARY_TITLES.map(([key, title]) => (
                <section key={key} className="border-t border-[#292D27]/20 pt-4" data-testid={`summary-${key}`}>
                  <h2 className="eyebrow text-[#657153]">{title}</h2>
                  <ul className="mt-3 space-y-1.5 text-[13px]">
                    {Object.entries(data.summary[key]).sort((a, b) => b[1] - a[1]).map(([value, count]) => (
                      <li key={value} className="flex justify-between gap-3"><span>{label(value)}</span><strong>{count}</strong></li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-12 overflow-x-auto border border-[#292D27]/15">
              <table className="w-full min-w-[900px] border-collapse text-left text-[12px]" data-testid="table-signups">
                <thead className="bg-[#F0EDE5] text-[11px] uppercase tracking-[.08em]">
                  <tr>{['Date', 'Name', 'Email', 'Audience', 'Would buy at ₹2,600', 'Price feels', 'Top feature', 'Feedback'].map((h) => <th key={h} className="px-3 py-3 font-bold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {data.signups.map((row) => (
                    <tr key={row.id} className="border-t border-[#292D27]/10 align-top">
                      <td className="whitespace-nowrap px-3 py-3">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-3">{row.firstName}</td>
                      <td className="px-3 py-3">{row.email}</td>
                      <td className="px-3 py-3">{label(row.audience)}</td>
                      <td className="px-3 py-3">{label(row.purchaseInterest)}</td>
                      <td className="px-3 py-3">{label(row.priceFeeling)}</td>
                      <td className="px-3 py-3">{label(row.priorityFeature)}</td>
                      <td className="max-w-[260px] px-3 py-3 text-[#55574F]">{row.feedback ?? '—'}</td>
                    </tr>
                  ))}
                  {data.signups.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-[#77796F]">No signups yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
