/* AI 语言实验室 · 跨设备云同步
   后端：自己部署的 Cloudflare Worker（/api/sync + KV），与发音共用同一地址。
   同步码 = 这份学习档案的私人钥匙；进度在浏览器里字段级合并，不会互相覆盖。
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
    if (lastErr) return '云端暂不可用：' + friendly(lastErr) + '（进度仍安全保存在本机）';
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
      (needDeploy ? '<div class="modal-foot" style="margin:0 0 12px;background:#fff7e6;border:1px solid #ffe0a3;color:#9a6a00">⚠ 云端同步接口尚未启用：面板与本地逻辑已就绪，部署完成后点「立即同步」即可。当前进度仍安全保存在本机。</div>' : '') +
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
      '<div class="modal-foot">同步码会保存在这台设备的浏览器里，下次打开自动同步。<b>本地视频 / 音频文件本体不上传</b>（太大），换设备后需重新选一次文件。云端只放学习进度，不放媒体。</div>' +
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
    if (a === 'off') {
      delete S.syncKey; lastErr = ''; lastOk = 0;
      clearTimeout(pushTimer); clearInterval(pollTimer); pollTimer = null;
      try { save(); } catch (e) { }
      openPanel(); toast('已关闭云同步，进度仍保存在本机'); return;
    }
  });

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
  }
  boot();

  /* 测试与调试入口（不影响正常功能） */
  window.SyncLab = {
    genKey: genKey, mergeState: mergeState, stable: stable, stateForCloud: stateForCloud,
    pull: pull, push: push, openPanel: openPanel, updateUI: updateUI, endpoint: endpoint,
    syncURL: syncURL, setKey: setKey,
    status: function () { return { key: S.syncKey || '', busy: busy, lastOk: lastOk, lastErr: lastErr }; }
  };
})();
