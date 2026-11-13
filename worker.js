/*
  ============================================================
  AI 语言实验室 · 免费微软 Edge TTS 代理（Cloudflare Worker）
  —— 无需 API key、不花钱，返回微软「在线神经语音」(Aria/Jenny/Guy…)
  ------------------------------------------------------------
  协议要点（2026 现行版，与 edge-tts 官方一致）：
   · Sec-MS-GEC 必须是 v2（CS64 + SHA-256），旧版 v1 会被 403 拒绝
   · Cloudflare Workers 里出站 WebSocket 必须走 fetch + Upgrade:websocket，
     才能携带 Origin / User-Agent 等自定义头（new WebSocket 的第三参数被忽略）
   · 音频在二进制帧里，前 2 字节（大端）是头部长度
  ------------------------------------------------------------
  前端调用： GET <本Worker地址>?text=...&voice=en-US-AriaNeural&rate=0%&pitch=0%
  返回：     audio/mpeg（mp3）
  健康检查： GET <本Worker地址>/health  -> {"ok":true,...}
  ------------------------------------------------------------
  部署： wrangler login && wrangler deploy   （或用 Cloudflare 网页粘贴本文件）
  ============================================================
*/

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split('.')[0];
const SEC_MS_GEC_VERSION = '2-' + CHROMIUM_FULL_VERSION;
const AUDIO_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';
const SYNTHESIS_URL = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

const UPGRADE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + CHROMIUM_MAJOR + '.0.0.0 Safari/537.36 Edg/' + CHROMIUM_MAJOR + '.0.0.0',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache',
  'Sec-WebSocket-Version': '13',
  'Upgrade': 'websocket'
};

/* ============ Sec-MS-GEC v2（移植自 edge-tts drm.py） ============ */
const WIN_EPOCH_SECONDS = 11644473600;
const TOKEN_WINDOW_SECONDS = 300;

const SHA256_INITIAL = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];
const SHA256_PREFIX_STATE = [
  0xfd9fbea2, 0x91243ce7, 0xbe499094, 0xcd2e1e0a,
  0x6c006f49, 0x04bd35ab, 0xfeb0a7e4, 0x03effbd2
];
const SHA256_PREFIX_SCHEDULE = [
  0xeb24bf9e, 0x1558691f, 0xa0c09ee2, 0x0cfa32ba,
  0xa622ee8c, 0xd1dd9491, 0xc0dd25a0, 0xf9e70ab6,
  0xf0c31573, 0x7058ce4e, 0x7188e606, 0x00e5ab33,
  0xd258b060, 0x72766564
];
const SHA256_ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];
const SHA256_ROUND_14_ADJUSTMENT = 0xc9dc06a7;
const SHA256_PREFIX_BLOCK_CONSTANTS = SHA256_ROUND_CONSTANTS.map(function (c, i) {
  return i === 14 ? SHA256_ROUND_14_ADJUSTMENT : c;
});
const SHA256_SIGMA0_ADJUSTMENT = 0x059c0b80;
const SHA256_SIGMA1_ADJUSTMENT = 0x000b92c0;

const CS64_COEFFICIENTS = [
  [0xe82e91b1, 0xb32700d0], [0x44de24c6, 0x88dff51d],
  [0x3beb65bc, 0x29514038], [0xc89c5933, 0xb328cbdf],
  [0x8d1ec211, 0xd405b4d5], [0x314ef5d5, 0x26e55f3c],
  [0xe92491b1, 0x607801c6], [0xf0a5b9d5, 0x82b2c1fb],
  [0x06064cf3, 0xfa51a3da], [0xda79fa60, 0x207cc464],
  [0xbed20560, 0x3c3c74f3], [0x89f9c9f8, 0xd2d14b61],
  [0x35fa38c6, 0xbb04a2c1], [0xcb49e3c6, 0xc5626167]
];
const CS64_FACTOR = 0x82893933;
const CS64_ADJUSTMENT0 = 0xf2f90b1a;
const CS64_ADJUSTMENT1 = 0x0b1a0000;

function rotr(v, n) { return ((v >>> n) | (v << (32 - n))) >>> 0; }
function rol16(v) { return ((v << 16) | (v >>> 16)) >>> 0; }
function sigma0(v) { return (rotr(v, 7) ^ rotr(v, 18) ^ (v >>> 3)) >>> 0; }
function sigma1(v) { return (rotr(v, 17) ^ rotr(v, 19) ^ (v >>> 10)) >>> 0; }

function expandSchedule(words, firstWord) {
  for (let i = firstWord === undefined ? 16 : firstWord; i < 64; i += 1) {
    words[i] = (sigma1(words[i - 2]) + words[i - 7] + sigma0(words[i - 15]) + words[i - 16]) >>> 0;
  }
}
function compress(state, words, firstRound) {
  const constants = firstRound === 14 ? SHA256_PREFIX_BLOCK_CONSTANTS : SHA256_ROUND_CONSTANTS;
  let [a, b, c, d, e, f, g, h] = state;
  for (let i = firstRound || 0; i < 64; i += 1) {
    const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) +
      (g ^ (e & (f ^ g))) + constants[i] + words[i]) >>> 0;
    const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) +
      ((a & b) | (c & (a | b)))) >>> 0;
    h = g; g = f; f = e; e = (d + t1) >>> 0;
    d = c; c = b; b = a; a = (t1 + t2) >>> 0;
  }
  return [a, b, c, d, e, f, g, h];
}
function prefixBlockState(payload) {
  const words = new Array(14).fill(0);
  words.push((payload[0] << 16) | (payload[1] << 8) | payload[2]);
  words.push(((payload[3] << 24) | (payload[4] << 16) | (payload[5] << 8) | payload[6]) >>> 0);
  for (let i = 16; i < 30; i += 1) {
    let v = SHA256_PREFIX_SCHEDULE[i - 16] +
      (i === 16 ? ((sigma1(words[14]) ^ SHA256_SIGMA1_ADJUSTMENT) >>> 0) : sigma1(words[i - 2]));
    if (i >= 21) v += words[i - 7];
    if (i === 29) v += (sigma0(words[14]) ^ SHA256_SIGMA0_ADJUSTMENT) >>> 0;
    words.push(v >>> 0);
  }
  words.push((sigma1(words[28]) + words[23] + sigma0(words[15]) + words[14] +
    SHA256_ROUND_14_ADJUSTMENT - SHA256_ROUND_CONSTANTS[14]) >>> 0);
  expandSchedule(words, 31);
  const working = compress(SHA256_PREFIX_STATE, words, 14);
  return SHA256_INITIAL.map(function (v, i) { return (v + working[i]) >>> 0; });
}
function sha256Digest(payload) {
  if (payload.length < 7) throw new Error('GEC payload too short');
  const messageLength = 57 + payload.length;
  const zeroPadding = (((55 - messageLength) % 64) + 64) % 64;
  const tail = new Uint8Array(payload.length - 7 + 1 + zeroPadding + 8);
  tail.set(payload.subarray(7));
  tail[payload.length - 7] = 0x80;
  const tailView = new DataView(tail.buffer);
  const bitLength = messageLength * 8;
  tailView.setUint32(tail.length - 8, Math.floor(bitLength / 2 ** 32));
  tailView.setUint32(tail.length - 4, bitLength >>> 0);
  let state = prefixBlockState(payload);
  for (let off = 0; off < tail.length; off += 64) {
    const words = [];
    for (let i = 0; i < 16; i += 1) words.push(tailView.getUint32(off + i * 4));
    expandSchedule(words);
    const working = compress(state, words, 0);
    state = state.map(function (v, i) { return (v + working[i]) >>> 0; });
  }
  const digest = new Uint8Array(32);
  const dv = new DataView(digest.buffer);
  state.forEach(function (v, i) { dv.setUint32(i * 4, v); });
  return digest;
}
function cs64Words(payload) {
  const byteLength = Math.ceil((payload.length + 1) / 8) * 8;
  const bytes = new Uint8Array(byteLength);
  bytes.set(payload, 1);
  const view = new DataView(bytes.buffer);
  const words = [];
  for (let off = 0; off < byteLength; off += 4) words.push(view.getUint32(off, true));
  return words;
}
function cs64Digest(payload, digest) {
  const dv = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  const keyA = (dv.getUint32(0, true) | 1) >>> 0;
  const keyB = (dv.getUint32(4, true) | 1) >>> 0;
  const factors = [Math.imul(keyA, CS64_FACTOR) >>> 0, Math.imul(keyB, CS64_FACTOR) >>> 0];
  const terms = CS64_COEFFICIENTS.map(function (pair, i) {
    return Math.imul(pair[0], factors[i % 2]) >>> 0;
  });
  const offsets = CS64_COEFFICIENTS.map(function (pair) { return pair[1]; });
  cs64Words(payload).forEach(function (word, i) {
    const even = i % 2 === 0;
    let term = Math.imul(word, even ? keyA : keyB);
    let offset = Math.imul(rol16(word), even ? 0xef0569fb : 0xc31713db);
    if (i === 0) {
      term += Math.imul(CS64_ADJUSTMENT0, factors[0]);
      offset += CS64_ADJUSTMENT1;
    }
    terms.push(term >>> 0);
    offsets.push(offset >>> 0);
  });
  let swapAcc = 0, swapLast = 0, state = 0, acc = 0;
  for (let i = 0; i < terms.length; i += 2) {
    const x = terms[i], y = terms[i + 1];
    let q = Math.imul(rol16((offsets[i] + x) >>> 0), 0x76f50f34) >>> 0;
    swapAcc = (swapAcc + Math.imul(rol16(q), 0xc3efea97) + q) >>> 0;
    q = Math.imul(rol16((offsets[i + 1] + y) >>> 0), 0x1881ce3c) >>> 0;
    swapLast = (Math.imul(rol16(q), 0x35bd1ec9) + q) >>> 0;
    swapAcc = (swapAcc + swapLast) >>> 0;
    state = (Math.imul(state, keyA) + x) >>> 0;
    state = Math.imul(rol16(state), 0xcf98b111) >>> 0;
    state = Math.imul(rol16(state), 0x87085b9f) >>> 0;
    state = Math.imul(rol16(state), 0x12ceb96d) >>> 0;
    state = Math.imul(rol16(state), 0x257e1d83) >>> 0;
    acc = (acc + state) >>> 0;
    let t = (Math.imul(state, keyB) + y) >>> 0;
    t = Math.imul(rol16(t), 0xa27416f5) >>> 0;
    t = Math.imul(rol16(t), 0xd38396ff) >>> 0;
    t = Math.imul(rol16(t), 0x7c932b89) >>> 0;
    state = Math.imul(rol16(t), 0xbfa49f69) >>> 0;
    acc = (acc + state) >>> 0;
  }
  return [(swapLast ^ state) >>> 0, (swapAcc ^ acc) >>> 0];
}
function toHex(bytes) {
  return Array.from(bytes).map(function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}
function hashSecMsGecPayload(payloadStr) {
  const bytes = new TextEncoder().encode(payloadStr);
  const digest = sha256Digest(bytes);
  const checksum = new Uint8Array(8);
  const cv = new DataView(checksum.buffer);
  cs64Digest(bytes, digest).forEach(function (w, i) { cv.setUint32(i * 4, w, true); });
  return toHex(checksum) + '-' + toHex(digest);
}
function generateSecMsGec(token, unixSeconds) {
  const now = unixSeconds === undefined ? Date.now() / 1000 : unixSeconds;
  let ticks = now + WIN_EPOCH_SECONDS;
  ticks -= ticks % TOKEN_WINDOW_SECONDS;
  ticks *= 1e7;
  return hashSecMsGecPayload(ticks.toFixed(0) + token);
}

/* ============ 消息与帧 ============ */
function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function cleanXml(s) {
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ');
}
function randHex(n) {
  const b = new Uint8Array(n / 2);
  crypto.getRandomValues(b);
  return Array.from(b).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
}
function ts() { return new Date().toISOString().replace(/[-:.]/g, '').slice(0, -1); }
function parseHeaders(text) {
  const sep = text.indexOf('\r\n\r\n');
  const head = sep >= 0 ? text.slice(0, sep) : text;
  const out = {};
  head.split('\r\n').forEach(function (line) {
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i)] = line.slice(i + 1).trim();
  });
  return out;
}
function parseBinaryFrame(bytes) {
  const hlen = (bytes[0] << 8) | bytes[1];
  const header = new TextDecoder().decode(bytes.slice(2, 2 + hlen));
  return { headers: parseHeaders(header), body: bytes.slice(2 + hlen) };
}
function configMessage() {
  return 'X-Timestamp:' + ts() + '\r\n' +
    'Content-Type:application/json; charset=utf-8\r\n' +
    'Path:speech.config\r\n\r\n' +
    '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"' + AUDIO_FORMAT + '"}}}}\r\n';
}
function ssmlMessage(requestId, voice, text, rate, pitch) {
  const ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
    "<voice name='" + voice + "'><prosody pitch='" + pitch + "' rate='" + rate + "' volume='+0%'>" +
    escapeXml(cleanXml(text)) + '</prosody></voice></speak>';
  return 'X-RequestId:' + requestId + '\r\n' +
    'Content-Type:application/ssml+xml\r\n' +
    'X-Timestamp:' + ts() + 'Z\r\n' +
    'Path:ssml\r\n\r\n' + ssml;
}
function normalizeVoice(v) {
  // 短名 en-US-AriaNeural -> 微软要求的完整名
  const m = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/.exec(String(v || '').trim());
  if (!m) return String(v || '').trim();
  let region = m[2], name = m[3];
  if (name.indexOf('-') >= 0) {
    const parts = name.split('-');
    region += '-' + parts[0];
    name = parts.slice(1).join('-');
  }
  return 'Microsoft Server Speech Text to Speech Voice (' + m[1] + '-' + region + ', ' + name + ')';
}
function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return null;
}

/* ============ 合成 ============ */
async function edgeTTS(text, voice, rate, pitch) {
  const url = new URL(SYNTHESIS_URL);
  url.searchParams.set('TrustedClientToken', TRUSTED_CLIENT_TOKEN);
  url.searchParams.set('Sec-MS-GEC', generateSecMsGec(TRUSTED_CLIENT_TOKEN));
  url.searchParams.set('Sec-MS-GEC-Version', SEC_MS_GEC_VERSION);
  url.searchParams.set('ConnectionId', randHex(32));

  const resp = await fetch(url.toString(), {
    headers: Object.assign({}, UPGRADE_HEADERS, { Cookie: 'muid=' + randHex(32).toUpperCase() + ';' })
  });
  if (resp.status !== 101 || !resp.webSocket) {
    throw new Error('WebSocket upgrade failed: ' + resp.status);
  }
  const ws = resp.webSocket;

  return new Promise(function (resolve, reject) {
    const chunks = [];
    let gotAudio = false, settled = false, timer;
    function finish(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch (e) { /* ignore */ }
      if (err) reject(err);
      else if (!gotAudio) reject(new Error('no audio received'));
      else resolve(new Blob(chunks, { type: 'audio/mpeg' }));
    }
    timer = setTimeout(function () { finish(new Error('edge tts timeout')); }, 30000);
    ws.addEventListener('message', function (ev) {
      if (settled) return;
      const data = ev.data;
      if (typeof data === 'string') {
        const h = parseHeaders(data);
        if (h.Path === 'turn.end') return finish();
        return; // response / turn.start / audio.metadata 等忽略
      }
      const bytes = toBytes(data);
      if (!bytes) return;
      try {
        const frame = parseBinaryFrame(bytes);
        if (frame.headers.Path !== 'audio') return;
        if (frame.body.length) { gotAudio = true; chunks.push(frame.body); }
      } catch (e) { finish(e); }
    });
    ws.addEventListener('close', function () { finish(); });
    ws.addEventListener('error', function () { finish(new Error('edge websocket error')); });
    ws.accept();
    ws.send(configMessage());
    ws.send(ssmlMessage(randHex(32), normalizeVoice(voice), text, rate, pitch));
  });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

/* ---------- 学习档案云同步（Cloudflare KV） ----------
   同步码就是这份档案的私人凭证：随机十六进制串，知道码的人可读写。
   前端负责字段级合并，服务端只保存最近一次写入的完整档案。
   没有绑定 KV 时返回明确的 503，绝不假装同步成功。 */
const SYNC_PATH = '/api/sync';
const SYNC_KEY_RE = /^[a-f0-9]{16,64}$/i;
const SYNC_MAX_BYTES = 900 * 1024;

function syncJson(obj, status){
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({}, CORS, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    })
  });
}
async function handleSync(request, env, url){
  const kv = env && env.SYNC_KV;
  if(!kv) return syncJson({ok:false,error:'sync store not configured'},503);
  const key = (url.searchParams.get('k') || '').trim();
  if(!SYNC_KEY_RE.test(key)) return syncJson({ok:false,error:'bad sync key'},400);
  const kvKey = 'profile:' + key.toLowerCase();
  if(request.method === 'GET'){
    const raw = await kv.get(kvKey);
    if(!raw) return syncJson({ok:true,empty:true},200);
    try{ return syncJson({ok:true,payload:JSON.parse(raw)},200); }
    catch(e){ return syncJson({ok:false,error:'corrupt data'},500); }
  }
  if(request.method === 'PUT'){
    const body = await request.text();
    if(body.length > SYNC_MAX_BYTES) return syncJson({ok:false,error:'payload too large'},413);
    let p; try{ p = JSON.parse(body); }catch(e){ return syncJson({ok:false,error:'bad json'},400); }
    if(!p || !p.state || typeof p.state !== 'object') return syncJson({ok:false,error:'bad payload'},400);
    const ts = Date.now();
    await kv.put(kvKey, JSON.stringify({state:p.state, ts:ts}));
    return syncJson({ok:true,ts:ts},200);
  }
  return syncJson({ok:false,error:'method not allowed'},405);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    if (url.pathname === SYNC_PATH) return handleSync(request, env, url);
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, gec: 'v2', version: SEC_MS_GEC_VERSION, sync: !!(env && env.SYNC_KV) }),
        { headers: Object.assign({}, CORS, { 'Content-Type': 'application/json' }) });
    }
    const text = url.searchParams.get('text') || '';
    const voice = url.searchParams.get('voice') || 'en-US-AriaNeural';
    const rate = url.searchParams.get('rate') || '0%';
    const pitch = url.searchParams.get('pitch') || '0%';
    if (!text) return new Response('missing text', { status: 400, headers: CORS });
    try {
      const blob = await edgeTTS(text, voice, rate, pitch);
      return new Response(blob, {
        headers: Object.assign({}, CORS, {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400'
        })
      });
    } catch (e) {
      return new Response('edge tts failed: ' + (e && e.message || e), { status: 502, headers: CORS });
    }
  }
};
