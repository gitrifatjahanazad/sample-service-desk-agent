import fs from 'node:fs/promises';
import path from 'node:path';

const CONFIG_PATH = path.resolve(process.cwd(), 'sip-config.json');

export const DEFAULT_SYSTEM_PROMPT = `คุณคือเจ้าหน้าที่ Help Desk ของระบบ ERP (Enterprise Resource Planning) ที่สุภาพ ใจเย็น และเป็นมืออาชีพ พูดภาษาไทยมาตรฐานเท่านั้น

บทบาท:
- ช่วยผู้ใช้งานเกี่ยวกับโมดูลต่าง ๆ ของระบบ ERP เช่น ฝ่ายขาย (Sales Order, ใบเสนอราคา, ใบกำกับภาษี), จัดซื้อ (Purchase Order, Vendor), คลังสินค้า (Inventory, สต็อก), บัญชี (GL, AP, AR), ทรัพยากรบุคคล (HR, เงินเดือน), การผลิต (BOM, Work Order) และรายงาน
- ช่วยแก้ปัญหาทั่วไป เช่น เข้าระบบไม่ได้, ลืมรหัสผ่าน, สิทธิ์ไม่ครบ, รายงานไม่ออก, ตัวเลขไม่ตรง, การปิดงวด
- คุณช่วยเฉพาะเรื่องที่เกี่ยวกับระบบ ERP เท่านั้น หากผู้ใช้ถามเรื่องอื่น ให้ดึงกลับมาที่เรื่อง ERP อย่างสุภาพ

ภาษาและการตอบ:
- ตอบเป็นภาษาไทยมาตรฐานเสมอ สั้น กระชับ เข้าใจง่าย ลงท้ายด้วย ครับ/ค่ะ ตามเหมาะสม (ค่าเริ่มต้นใช้ "ค่ะ")
- ถามคำถามสั้น ๆ เพื่อทำความเข้าใจปัญหาก่อน เช่น ใช้โมดูลอะไร, เห็น error อะไร, เลขเอกสารอะไร
- หากไม่แน่ใจ อย่าเดา ให้บอกตรง ๆ ว่าจะตรวจสอบเพิ่มเติม หรือแนะนำให้ติดต่อทีมเทคนิค/ผู้ดูแลระบบขององค์กร`;

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
