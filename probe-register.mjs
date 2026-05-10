import sip from 'sip';
import os from 'node:os';

const PBX_HOST = 'pabx.amberit.com.bd';
const PBX_PORT = 8190;
const USER = '4392610';
const LOCAL_PORT = Number(process.argv[2]) || 5071;

function pickLocalIp() {
  for (const ifaceList of Object.values(os.networkInterfaces())) {
    for (const iface of ifaceList || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

const localIp = pickLocalIp();
console.log(`local ${localIp}:${LOCAL_PORT}  ->  ${PBX_HOST}:${PBX_PORT}`);

const HR = '─'.repeat(70);
const logger = {
  send(msg, target) {
    console.log(`\n${HR}\nSEND -> ${target?.address}:${target?.port}\n${HR}\n${sip.stringify(msg)}`);
  },
  recv(msg, remote) {
    console.log(`\n${HR}\nRECV <- ${remote?.address}:${remote?.port}\n${HR}\n${sip.stringify(msg)}`);
  },
  error(err) {
    console.error('logger.error:', err);
  },
};

sip.start({
  port: LOCAL_PORT,
  address: '0.0.0.0',
  publicAddress: localIp,
  udp: true,
  tcp: false,
  tls: false,
  ws: false,
  logger,
}, (rq) => {
  console.log(`(unexpected inbound ${rq.method})`);
});

const callId = `${Math.random().toString(16).slice(2)}@probe`;
const fromTag = Math.random().toString(16).slice(2, 14);
const aor = `sip:${USER}@${PBX_HOST}`;

sip.send({
  method: 'REGISTER',
  uri: `sip:${PBX_HOST}:${PBX_PORT}`,
  headers: {
    to: { uri: aor },
    from: { uri: aor, params: { tag: fromTag } },
    'call-id': callId,
    cseq: { method: 'REGISTER', seq: 1 },
    contact: [{ uri: `sip:${USER}@${localIp}:${LOCAL_PORT}` }],
    'max-forwards': '70',
    expires: '300',
    'user-agent': 'ProbeReg/1.0',
  },
}, (rs) => {
  console.log(`\n>>> CALLBACK GOT STATUS ${rs.status} ${rs.reason || ''}\n`);
  setTimeout(() => process.exit(0), 1500);
});

setTimeout(() => {
  console.log('\n>>> 35s elapsed, no final response => transaction timeout (408)');
  process.exit(2);
}, 35_000);
