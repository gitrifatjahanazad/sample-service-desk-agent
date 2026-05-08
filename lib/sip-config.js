import fs from 'node:fs/promises';
import path from 'node:path';

const CONFIG_PATH = path.resolve(process.cwd(), 'sip-config.json');

export const DEFAULT_SYSTEM_PROMPT = `আপনি Robi (রবি) মোবাইল অপারেটরের একজন ভদ্র, সাহায্যকারী বাংলাভাষী কাস্টমার সার্ভিস এজেন্ট।

ভূমিকা:
- গ্রাহকদের রবি সংক্রান্ত সেবা যেমন কল রেট, ইন্টারনেট ও মিনিট প্যাকেজ, রিচার্জ, বান্ডেল অফার, MNP, রোমিং, বিল পেমেন্ট, FnF, USSD কোড, কাস্টমার কেয়ার ইত্যাদি বিষয়ে সাহায্য করুন।
- আপনি শুধু রবি সংক্রান্ত বিষয়ে সাহায্য করেন—অন্য বিষয়ে প্রশ্ন এলে ভদ্রভাবে গ্রাহককে রবি সম্পর্কিত প্রশ্নে ফিরিয়ে আনুন।

ভাষা ও উত্তর:
- সর্বদা শুধু বাংলায় উত্তর দিন—সংক্ষিপ্ত, পরিষ্কার এবং সহজ ভাষায়।
- প্রয়োজনে গ্রাহকের সমস্যা বুঝতে প্রশ্ন করুন।
- নিশ্চিত না হলে অনুমান করবেন না—গ্রাহককে রবি কাস্টমার কেয়ার (১২১) এ কল করতে অথবা https://www.robi.com.bd ভিজিট করতে অনুরোধ করুন।`;

export const DEFAULT_CONFIG = {
  enabled: false,
  accountName: '',
  sipServer: '',
  sipProxy: '',
  username: '',
  domain: '',
  login: '',
  password: '',
  displayName: '',
  voicemailNumber: '',
  dialingPrefix: '',
  dialPlan: '',
  hideCallerId: 'Disabled',
  mediaEncryption: 'Disabled',
  transport: 'UDP',
  publicAddress: 'Auto',
  registerRefresh: 300,
  keepAlive: 15,
  publishPresence: false,
  allowIpRewrite: false,
  ice: false,
  disableSessionTimers: false,
  instructions: DEFAULT_SYSTEM_PROMPT,
};

export async function loadConfig() {
  try {
    const text = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(text);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    if (err.code === 'ENOENT') return { ...DEFAULT_CONFIG };
    throw err;
  }
}

export async function saveConfig(cfg) {
  const merged = { ...DEFAULT_CONFIG, ...cfg };
  const tmp = `${CONFIG_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(merged, null, 2), 'utf8');
  await fs.rename(tmp, CONFIG_PATH);
  return merged;
}

export function redactConfig(cfg) {
  const { password, ...rest } = cfg;
  return { ...rest, passwordSet: Boolean(password) };
}

export function mergeIncoming(current, incoming) {
  const next = { ...current, ...incoming };
  // If the client did not send a new password (or sent the redacted placeholder), keep the existing one.
  if (
    !Object.prototype.hasOwnProperty.call(incoming, 'password') ||
    incoming.password === '' ||
    incoming.password === undefined ||
    incoming.password === null
  ) {
    next.password = current.password;
  }
  return next;
}
