/* AI 语言实验室 · 跨设备同步
   两条路，都是免费的：
   1) 同步链接：把学习档案压进一条网址，另一台设备打开即合并，零服务器、零配置，随时能用；
   2) 自动云同步：自己部署的 Cloudflare Worker（/api/sync + KV），同步码作为私人钥匙，
      保存后自动上传、45 秒自动拉取。后端未部署时不影响第 1 条。
   两条路都用字段级合并，多台设备各练的内容不会互相覆盖。
   依赖：app.js 的 S / save / paint / openModal / closeModal / toast / esc。 */
(function () {
  'use strict';

  var busy = false, pushTimer = null, pollTimer = null;
  var lastOk = 0, lastErr = '';

  /* ---------------- 地址与同步码 ---------------- */
  function endpoint() {
    var raw = S.syncEndpoint || S.edgeUrl ||
      (typeof DEFAULT_EDGE_URL !== 'undefined' ? DEFAULT_EDGE_URL : '');
    return String(raw || '').replace(/\/+$/, '');
  }
  function syncURL() {
    return endpoint() + '/api/sync?k=' + encodeURIComponent(S.syncKey || '');
  }
  function genKey() {
    var a = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(a);
    var s = '';
    for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2);
    return s;
  }
  function mask(k) {
    return k ? k.slice(0, 6) + '••••••••' + k.slice(-4) : '';
  }

  /* ---------------- 零后端「同步链接」 ----------------
     把完整学习档案 gzip 压缩 + base64url 放进 URL 的 # 片段里。
     # 片段不会发给服务器，也不会被网站日志记录；打开链接时前端自行解密合并。
     浏览器不支持 CompressionStream 时自动退回未压缩编码，功能仍然可用。 */
  function bytesToB64(u8) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < u8.length; i += CH) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    }
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64ToBytes(s) {
    var b = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var raw = atob(b), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  async function through(u8, stream) {
    var rs = new Blob([u8]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(rs).arrayBuffer());
  }
  async function zip(u8) {
    if (typeof CompressionStream === 'undefined') return { p: 'j', d: u8 };
    try { return { p: 'g', d: await through(u8, new CompressionStream('gzip')) }; }
    catch (e) { return { p: 'j', d: u8 }; }
  }
  async function unzip(flag, u8) {
    if (flag === 'j') return u8;
    if (flag !== 'g' || typeof DecompressionStream === 'undefined')
      throw new Error('这个浏览器不支持解压同步链接，请改用「导出档案文件」');
    return through(u8, new DecompressionStream('gzip'));
  }
  async function makeLink() {
    var payload = { v: 1, app: 'ai-language-lab', t: Date.now(), state: stateForCloud() };
    var raw = new TextEncoder().encode(JSON.stringify(payload));
    var z = await zip(raw);
    return location.href.split('#')[0] + '#s=' + z.p + bytesToB64(z.d);
  }
  async function readLink(link) {
    var s = String(link || ''), at = s.indexOf('#s=');
    if (at < 0) throw new Error('这不是同步链接（缺少 #s= 片段）');
    var code = s.slice(at + 3).trim(), flag = code.charAt(0), b64 = code.slice(1);
    if (!/[gj]/.test(flag) || b64.length < 8) throw new Error('同步链接内容不完整');
    var raw = await unzip(flag, b64ToBytes(b64));
    var p;
    try { p = JSON.parse(new TextDecoder().decode(raw)); }
    catch (e) { throw new Error('同步链接已损坏或已被截断'); }
    if (!p || p.app !== 'ai-language-lab' || !p.state || typeof p.state !== 'object')
      throw new Error('同步链接里没有有效的学习档案');
    return p;
  }
  async function importLink(link, quiet) {
    var p = await readLink(link);
    var merged = mergeState(S, p.state);
    if (stable(merged) !== stable(S)) applyMerged(merged);
    if (S.syncKey) schedulePush(400);
    if (!quiet) toast('已合并另一台设备的学习档案：进度、词库、素材都回来了');
    return { ok: true, t: p.t };
  }

  /* ---------------- 字段级合并 ---------------- */
  function arr(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function union(a, b) {
    var out = [], seen = {};
    arr(a).concat(arr(b)).forEach(function (v) {
      var k = String(v);
      if (!seen[k]) { seen[k] = 1; out.push(v); }
    });
    return out;
  }
  function mergeById(a, b) { // 本地(a)优先，按 id 去重
    var out = [], seen = {};
    arr(a).concat(arr(b)).forEach(function (c) {
      if (!c || !c.id || seen[c.id]) return;
      seen[c.id] = 1; out.push(c);
    });
    return out;
  }
  function mergeSteps(a, b) {
    var A = obj(a), B = obj(b), ids = {}, out = {};
    Object.keys(A).concat(Object.keys(B)).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (id) {
      var x = obj(A[id]), y = obj(B[id]);
      var xc = arr(obj(x.classic).done).concat(arr(Array.isArray(x.done) ? x.done : []));
      var yc = arr(obj(y.classic).done);
      var xq = arr(obj(x.quest).done), yq = arr(obj(y.quest).done);
      out[id] = { classic: { done: union(xc, yc) }, quest: { done: union(xq, yq) } };
    });
    return out;
  }
  function mergeState(local, remote) {
    var a = obj(local), b = obj(remote);
    var out = Object.assign({}, b, a); // 默认本地优先
    ['completed', 'qCompleted', 'days', 'weak'].forEach(function (k) { out[k] = union(a[k], b[k]); });
    out.diy = mergeById(a.diy, b.diy);
    ['dict', 'quiz', 'listen', 'srs', 'classroom'].forEach(function (k) {
      out[k] = Object.assign({}, obj(b[k]), obj(a[k]));
    });
    out.steps = mergeSteps(a.steps, b.steps);
    out.points = Math.max(num(a.points), num(b.points));
    var ga = obj(a.gate), gb = obj(b.gate);
    var stars = Object.assign({}, obj(gb.stars), obj(ga.stars));
    Object.keys(obj(gb.stars)).forEach(function (k) {
      stars[k] = Math.max(num(obj(gb.stars)[k]), num(stars[k]));
    });
    out.gate = { stars: stars, best: Math.max(num(ga.best), num(gb.best)) };
    var ta = obj(a.tank), tb = obj(b.tank);
    out.tank = { best: Math.max(num(ta.best), num(tb.best)), plays: Math.max(num(ta.plays), num(tb.plays)) };
    // 设备偏好与同步配置一律保留本机，不跟着档案跑
    ['voiceURI', 'edgeUrl', 'edgeVoice', 'ttsEngine', 'syncKey', 'syncEndpoint',
      'sixMode', 'track', 'edgePresetV1'].forEach(function (k) {
        if (a[k] !== undefined) out[k] = a[k]; else delete out[k];
      });
    return out;
  }
  /* 稳定序列化：避免键顺序差异导致反复误判「有变化」 */
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().map(function (k) {
        return JSON.stringify(k) + ':' + stable(v[k]);
      }).join(',') + '}';
    }
    var s = JSON.stringify(v);
    return s === undefined ? 'null' : s;
  }
  /* 上传时剔除设备偏好，避免把 A 设备的发音设置带到 B */
  function stateForCloud() {
    var s = {};
    Object.keys(S).forEach(function (k) { s[k] = S[k]; });
    ['voiceURI', 'edgeUrl', 'edgeVoice', 'ttsEngine'].forEach(function (k) { delete s[k]; });
    return s;
  }

  /* ---------------- 网络 ---------------- */
  function request(url, opts) {
    if (!endpoint()) return Promise.reject(new Error('未配置同步服务地址'));
    return fetch(url, opts);
  }
  async function push() {
    if (!S.syncKey) return false;
    try {
      var r = await request(syncURL(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateForCloud(), ts: Date.now() })
      });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
      lastOk = Date.now(); lastErr = '';
      return true;
    } catch (e) {
      lastErr = e && e.message ? e.message : '网络不可用';
      return false;
    } finally { updateUI(); }
  }
  async function pull() {
    if (!S.syncKey || busy) return false;
    busy = true; updateUI();
    try {
      var r = await request(syncURL(), { method: 'GET', cache: 'no-store' });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
      if (j.empty) { // 云端还没档案：把本机进度作为第一份传上去
        lastOk = Date.now(); lastErr = '';
        await push();
        return true;
      }
      var remote = j.payload && j.payload.state;
      if (!remote || typeof remote !== 'object') throw new Error('云端档案格式不对');
      var merged = mergeState(S, remote);
      if (stable(merged) !== stable(S)) {
        applyMerged(merged);
        schedulePush(600); // 让云端也尽快收敛到合并结果
      }
      lastOk = Date.now(); lastErr = '';
      return true;
    } catch (e) {
      lastErr = e && e.message ? e.message : '网络不可用';
      return false;
    } finally { busy = false; updateUI(); }
  }
  function schedulePush(ms) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { push(); }, ms === undefined ? 2500 : ms);
  }
  function applyMerged(m) {
    Object.keys(S).forEach(function (k) { delete S[k]; });
    Object.assign(S, m);
    try { save(); } catch (e) { }
    // 用户正在输入时不整页重绘，避免清空听写内容
    var ae = document.activeElement;
    var typing = ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName || '');
    if (!typing) { try { paint(); } catch (e) { } }
    else {
      var pv = document.getElementById('pointsVal');
      if (pv) pv.textContent = S.points;
    }
  }
  function isOnline() { return !!(S.syncKey && !lastErr); }

  /* ---------------- 界面 ---------------- */
  function friendly(e) {
    if (/sync store not configured|503/.test(e)) return '同步服务还未启用（后端待部署）';
    if (/HTTP 400|HTTP 404|HTTP 405|missing text/.test(e)) return '同步接口未就绪，请确认已部署最新版 Worker';
    if (/Failed to fetch|NetworkError|network|HTTP 5\d\d/i.test(e)) return '连不上同步服务，请检查网络';
    if (/bad sync key/.test(e)) return '同步码格式不对';
    return e;
  }
  function statusText() {
    if (!S.syncKey) return '未开启 · 进度只存在这台设备';
    if (busy) return '正在同步…';
    if (lastErr) return '自动云端暂不可用（' + friendly(lastErr) + '）；进度安全保存在本机，可用「同步链接」跨设备';
    if (lastOk) return '已同步 · ' + new Date(lastOk).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return '已开启 · 等待首次同步';
  }
  function updateUI() {
    var dot = document.getElementById('syncDot');
    if (dot) {
      dot.className = 'sync-dot' + (S.syncKey ? (lastErr ? ' err' : ' on') : '');
      dot.title = statusText();
    }
    var st = document.getElementById('syncStatus');
    if (st) {
      st.textContent = statusText();
      st.className = 'sync-status' + (S.syncKey ? (lastErr ? ' err' : ' ok') : '');
    }
    var codeEl = document.getElementById('syncCodeText');
    if (codeEl) codeEl.textContent = S.syncKey ? mask(S.syncKey) : '（尚未生成）';
    var bind = document.getElementById('syncCodeInput');
    if (bind && !bind.value && S.syncKey) bind.placeholder = '当前：' + mask(S.syncKey);
  }
  function openPanel() {
    var needDeploy = !!(lastErr && /HTTP 400|HTTP 404|HTTP 405|503|not configured|Failed to fetch|missing text/.test(lastErr));
    openModal(
      (needDeploy ? '<div class="modal-foot" style="margin:0 0 12px;background:#fff7e6;border:1px solid #ffe0a3;color:#9a6a00">⚠ 自动云端接口还没启用（后端待部署）。别担心：下面的「同步链接」不需要任何服务器，现在就能跨设备接力；进度也一直安全保存在本机。</div>' : '') +
      '<span class="modal-step">☁ 跨设备同步</span>' +
      '<h3>打开网址，进度自动接着学</h3>' +
      '<p>开启后，学习进度会自动存到云端；在手机 / 另一台电脑打开<b>同一个网址</b>，填入同一个同步码，就能接着学。两台设备分别练的内容会<b>合并</b>（积分取较高、已完成课程取并集），不会互相覆盖。</p>' +
      '<div id="syncStatus" class="sync-status">' + esc(statusText()) + '</div>' +
      '<div class="sync-keybox"><div class="sync-key-h">我的同步码 <span>私人钥匙，别发给别人</span></div>' +
      '<div class="sync-code" id="syncCodeText">' + esc(S.syncKey ? mask(S.syncKey) : '（尚未生成）') + '</div></div>' +
      '<div class="sync-row"><input id="syncCodeInput" class="vp-input" placeholder="粘贴另一台设备的同步码" autocomplete="off" spellcheck="false"></div>' +
      '<div class="sync-actions">' +
      '<button class="btn btn-primary btn-sm" data-sync="new">生成新同步码并开启</button>' +
      '<button class="btn btn-line btn-sm" data-sync="bind">用这个同步码</button>' +
      '<button class="btn btn-line btn-sm" data-sync="copy">复制同步码</button>' +
      '<button class="btn btn-line btn-sm" data-sync="now">立即同步</button>' +
      (S.syncKey ? '<button class="btn btn-line btn-sm" data-sync="off">关闭同步</button>' : '') +
      '</div>' +
      '<div class="sync-keybox" style="margin-top:15px">' +
        '<div class="sync-key-h">不用服务器的办法 · 同步链接 <span>免费 · 立刻可用</span></div>' +
        '<p class="sync-hint">把当前档案（自制素材、台词、字幕时间轴、六步进度、词库、积分）压成一条网址，发到手机 / 另一台电脑打开就自动合并。云端接口没配好也能用，链接本身不含视频文件。</p>' +
        '<div class="sync-row"><textarea id="syncLinkText" class="vp-input" rows="3" spellcheck="false" placeholder="点「生成同步链接」后这里出现网址；也可以把另一台设备发来的链接粘到这里"></textarea></div>' +
        '<div class="sync-actions">' +
          '<button class="btn btn-primary btn-sm" data-sync="makeLink">生成同步链接</button>' +
          '<button class="btn btn-line btn-sm" data-sync="copyLink">复制链接</button>' +
          '<button class="btn btn-line btn-sm" data-sync="importLink">导入这个链接</button>' +
          '<button class="btn btn-line btn-sm" data-sync="exportFile">导出档案文件</button>' +
          '<button class="btn btn-line btn-sm" data-sync="importFile">导入档案文件</button>' +
          '<input type="file" id="syncProfileFile" accept=".json,application/json" hidden>' +
        '</div>' +
      '</div>' +
      '<div class="modal-foot">同步码会保存在这台设备的浏览器里，下次打开自动同步；同步链接则是「一次性的快照」，另一台设备打开后会与本机进度合并。<b>视频 / 音频文件本体不进链接、也不进云端</b>（太大）：想让别的设备也能播，请在「我的素材库」给素材<b>绑定云端直链</b>，或把视频放进仓库的 media 目录。</div>' +
      '<div class="modal-actions" style="margin-top:14px"><button class="btn btn-line btn-sm" data-sync="close">关闭</button></div>'
    );
    updateUI();
  }
  function setKey(k) {
    S.syncKey = k;
    lastErr = '';
    try { save(); } catch (e) { }
    openPanel();
    pull();
  }

  /* ---------------- 事件 ---------------- */
  function linkBox() { return document.getElementById('syncLinkText'); }
  function copyText(text, okMsg) {
    var fallback = function () {
      var b = linkBox();
      if (b) { b.value = text; b.focus(); b.select(); }
      toast('请手动复制已选中的链接');
    };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    else fallback();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-sync]') : null;
    if (!t) return;
    var a = t.dataset.sync;
    if (a === 'open') { openPanel(); return; }
    if (a === 'close') { closeModal(); return; }
    if (a === 'new') { setKey(genKey()); toast('已开启云同步，正在上传本机进度'); return; }
    if (a === 'bind') {
      var inp = document.getElementById('syncCodeInput');
      var v = inp ? inp.value.trim().toLowerCase() : '';
      if (!/^[a-f0-9]{16,64}$/.test(v)) { toast('同步码格式不对：应是 16~64 位字母数字'); return; }
      setKey(v); toast('已绑定同步码，正在拉取云端进度'); return;
    }
    if (a === 'copy') {
      if (!S.syncKey) { toast('请先生成同步码'); return; }
      var done = function () { toast('同步码已复制，粘到另一台设备即可'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(S.syncKey).then(done, function () { toast('同步码：' + S.syncKey); });
      } else toast('同步码：' + S.syncKey);
      return;
    }
    if (a === 'now') { if (!S.syncKey) { toast('请先开启同步'); return; } pull().then(function () { schedulePush(200); }); return; }
    if (a === 'makeLink') {
      toast('正在打包学习档案…');
      makeLink().then(function (url) {
        var b = linkBox(); if (b) b.value = url;
        toast(url.length > 8000
          ? '档案较大，链接约 ' + url.length + ' 字符；建议改用「导出档案文件」更稳'
          : '同步链接已生成（' + url.length + ' 字符），复制到另一台设备打开即可');
      }).catch(function (err) { toast('生成失败：' + (err && err.message || err)); });
      return;
    }
    if (a === 'copyLink') {
      var v = linkBox() ? linkBox().value.trim() : '';
      if (!v) { toast('请先生成或粘贴同步链接'); return; }
      copyText(v, '同步链接已复制，发到另一台设备打开即可'); return;
    }
    if (a === 'importLink') {
      var raw = linkBox() ? linkBox().value.trim() : '';
      if (!raw) { toast('请先粘贴另一台设备的同步链接'); return; }
      importLink(raw).then(function () { closeModal(); })
        .catch(function (err) { toast('导入失败：' + (err && err.message || err)); });
      return;
    }
    if (a === 'exportFile') {
      if (typeof window.libExport === 'function') window.libExport();
      else toast('导出功能尚未就绪'); return;
    }
    if (a === 'importFile') {
      var fi = document.getElementById('syncProfileFile'); if (fi) fi.click(); return;
    }
    if (a === 'off') {
      delete S.syncKey; lastErr = ''; lastOk = 0;
      clearTimeout(pushTimer); clearInterval(pollTimer); pollTimer = null;
      try { save(); } catch (e) { }
      openPanel(); toast('已关闭云同步，进度仍保存在本机'); return;
    }
  });

  /* 同步面板里的「导入档案文件」 */
  document.addEventListener('change', function (e) {
    if (!e.target || e.target.id !== 'syncProfileFile') return;
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var raw = JSON.parse(String(rd.result || 'null'));
        if (raw && !Array.isArray(raw) && raw.kind === 'full-profile' && raw.state) {
          if (typeof window.libRestoreProfile === 'function') window.libRestoreProfile(raw.state);
          else {
            var m = mergeState(S, raw.state);
            if (stable(m) !== stable(S)) applyMerged(m);
          }
          closeModal();
        } else if (Array.isArray(raw)) {
          /* 也接受「素材数组」格式（与「我的素材库 → 导入学习档案」一致） */
          var ids = {}; (S.diy || []).forEach(function (c) { ids[c.id] = 1; });
          var n = 0;
          raw.forEach(function (c) {
            if (!c || !c.id || !c.custom || !c.custom.sentences || ids[c.id]) return;
            S.diy.push(c); ids[c.id] = 1; n++;
          });
          if (n) { try { save(); } catch (e) { } try { paint(); } catch (e) { } }
          closeModal();
          toast(n ? ('已导入 ' + n + ' 篇素材（媒体文件需重新选择）') : '没有可导入的新素材（可能已存在）');
        } else toast('请选择本站导出的「学习档案」JSON 文件');
      } catch (err) { toast('档案文件不是有效的 JSON'); }
      e.target.value = '';
    };
    rd.readAsText(f, 'utf-8');
  });

  /* 打开别人发来的同步链接：自动合并，然后把 # 片段从地址栏抹掉 */
  function consumeHashLink() {
    if ((location.hash || '').indexOf('#s=') < 0) return;
    var full = location.href;
    var clear = function () {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
    };
    importLink(full, true).then(function () {
      clear(); updateUI();
      toast('已通过同步链接接上另一台设备的学习档案');
    }).catch(function (err) {
      clear();
      toast('同步链接无效：' + (err && err.message || err) + '；本机进度未改动');
    });
  }

  /* 每次保存后自动上传（防抖）；页面可见时定期拉取其它设备的改动 */
  var origSave = window.save;
  window.save = function () {
    origSave();
    if (S.syncKey) schedulePush();
  };
  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      if (S.syncKey && document.visibilityState === 'visible' && !busy) pull();
    }, 45000);
  }
  document.addEventListener('visibilitychange', function () {
    if (S.syncKey && document.visibilityState === 'visible' && !busy) pull();
  });
  function boot() {
    if (S.syncKey) { pull(); startPolling(); }
    updateUI();
    consumeHashLink();
  }
  boot();

  /* 测试与调试入口（不影响正常功能） */
  window.SyncLab = {
    genKey: genKey, mergeState: mergeState, stable: stable, stateForCloud: stateForCloud,
    pull: pull, push: push, openPanel: openPanel, updateUI: updateUI, endpoint: endpoint,
    syncURL: syncURL, setKey: setKey,
    makeLink: makeLink, readLink: readLink, importLink: importLink, consumeHashLink: consumeHashLink,
    status: function () { return { key: S.syncKey || '', busy: busy, lastOk: lastOk, lastErr: lastErr }; }
  };
})();
