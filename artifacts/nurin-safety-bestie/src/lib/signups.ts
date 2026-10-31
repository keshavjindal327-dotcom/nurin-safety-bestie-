import {
  GoogleAuthProvider,
  browserSessionPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export const COLLECTION = 'earlyAccess';
export const MAX_ROWS = 5000;

export type EarlyAccessInput = {
  firstName: string;
  email: string;
  audience: string;
  purchaseInterest: string;
  priceFeeling: string;
  priorityFeature: string;
  useReason?: string;
  consent: true;
};

export type Signup = {
  id: string;
  createdAt: string;
  firstName: string;
  email: string;
  audience: string;
  purchaseInterest: string;
  priorityFeature: string;
  priceFeeling: string | null;
  feedback: string | null;
  consent: boolean;
};

export type SignupsResponse = {
  total: number;
  truncated: boolean;
  summary: Record<'audience' | 'purchaseInterest' | 'priorityFeature' | 'priceFeeling', Record<string, number>>;
  signups: Signup[];
};

function sanitizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/<[^>]*>/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Saves a signup. Resolves for both a new signup and an email that is already on the list. */
export async function submitEarlyAccess(input: EarlyAccessInput): Promise<void> {
  const firstName = sanitizeText(input.firstName).slice(0, 80);
  const email = sanitizeText(input.email).toLowerCase();
  const feedback = input.useReason ? sanitizeText(input.useReason).slice(0, 500) || null : null;
  if (!firstName || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) throw new Error('invalid');

  try {
    // Document ID = email, so one signup per email (matches the rules' `data.email == request.resource.id`).
    await setDoc(doc(db, COLLECTION, email), {
      firstName,
      email,
      audience: input.audience,
      purchaseInterest: input.purchaseInterest,
      priceFeeling: input.priceFeeling,
      priorityFeature: input.priorityFeature,
      feedback,
      consent: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // The rules only allow CREATE for the public. If this email is already on the list the write
    // becomes an update, which is refused with permission-denied - treat that as "already registered".
    if ((error as { code?: string }).code === 'permission-denied') {
      console.warn('Signup not created (already registered, or refused by Firestore rules).');
      return;
    }
    throw error;
  }
}

export async function adminSignIn(): Promise<User> {
  await setPersistence(auth, browserSessionPersistence); // closing the tab signs out, like before
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user;
}

export const adminSignOut = () => signOut(auth);

function tally(values: Array<string | null>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = value ?? 'not_answered';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Admin only: Firestore rules reject this for anyone but the admin account. */
export async function loadSignups(): Promise<SignupsResponse> {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(MAX_ROWS)));
  const signups: Signup[] = snap.docs.map((d) => {
    const x = d.data();
    const created = x['createdAt'];
    return {
      id: d.id,
      createdAt: (created instanceof Timestamp ? created.toDate() : new Date()).toISOString(),
      firstName: x['firstName'],
      email: x['email'],
      audience: x['audience'],
      purchaseInterest: x['purchaseInterest'],
      priorityFeature: x['priorityFeature'],
      priceFeeling: x['priceFeeling'] ?? null,
      feedback: x['feedback'] ?? null,
      consent: x['consent'] === true,
    };
  });
  return {
    total: signups.length,
    truncated: signups.length === MAX_ROWS,
    summary: {
      audience: tally(signups.map((r) => r.audience)),
      purchaseInterest: tally(signups.map((r) => r.purchaseInterest)),
      priorityFeature: tally(signups.map((r) => r.priorityFeature)),
      priceFeeling: tally(signups.map((r) => r.priceFeeling)),
    },
    signups,
  };
}

/** Neutralises spreadsheet formula injection (= + - @) before quoting a CSV cell. */
function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(signups: Signup[]): string {
  const header = ['id', 'submitted_at_utc', 'first_name', 'email', 'audience', 'would_consider_buying_at_rs2600', 'most_valued_feature', 'price_feels', 'optional_feedback', 'consent'];
  const lines = signups.map((r) =>
    [r.id, r.createdAt, r.firstName, r.email, r.audience, r.purchaseInterest, r.priorityFeature, r.priceFeeling, r.feedback, r.consent].map(csvCell).join(','),
  );
  // BOM so Excel reads UTF-8 correctly.
  return '\uFEFF' + [header.map(csvCell).join(','), ...lines].join('\r\n') + '\r\n';
}
