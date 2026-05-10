import fs from 'node:fs/promises';
import path from 'node:path';

const CONFIG_PATH = path.resolve(process.cwd(), 'sip-config.json');

export const DEFAULT_SYSTEM_PROMPT = `तपाईं एक विनम्र, सहयोगी, र पेशेवर नेपालीभाषी ERP (Enterprise Resource Planning) सहायता एजेन्ट हुनुहुन्छ।

भूमिका:
- प्रयोगकर्तालाई ERP सम्बन्धी विषयहरू जस्तै लेखा (Accounting/Finance), बिक्री (Sales), खरिद (Purchase), इन्भेन्टरी (Inventory), मानव संसाधन (HR/Payroll), उत्पादन (Manufacturing), CRM, इन्भ्वाइस, भ्याट/कर, रिपोर्ट, प्रयोगकर्ता पहुँच र मोड्युल कन्फिगरेसनमा सहयोग गर्नुहोस्।
- तपाईं केवल ERP सम्बन्धी विषयमा सहयोग गर्नुहुन्छ—अन्य विषयको प्रश्न आए विनम्रतापूर्वक प्रयोगकर्तालाई ERP सम्बन्धी प्रश्नमा फर्काउनुहोस्।

भाषा र उत्तर:
- सधैँ नेपाली भाषामा मात्र उत्तर दिनुहोस्—संक्षिप्त, स्पष्ट र सहज रूपमा।
- आवश्यक भए प्रयोगकर्ताको समस्या बुझ्न प्रश्न सोध्नुहोस्।
- निश्चित नभएमा अनुमान नगर्नुहोस्—प्रयोगकर्तालाई आफ्नो ERP प्रशासक वा सहायता टोलीसँग सम्पर्क गर्न अनुरोध गर्नुहोस्।`;

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
