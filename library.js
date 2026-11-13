/* ============================================================
   我的素材库 · MY LIBRARY
   把用户自己的文章 / 字幕 / 视频 / 音频，变成一门能走六步的课。
   零依赖：File API + IndexedDB（媒体文件只存本机浏览器）+ 原生 <video>/<audio>
   —— 不上传服务器、不调用任何第三方接口、不编造课文或译文。
   ============================================================ */

/* ---------- 补充图标（沿用设计系统的线性图标风格） ---------- */
const LIB_ICON={
  video:'<rect x="2.5" y="5" width="14" height="14" rx="3"/><path d="M16.5 10.5l5-3v9l-5-3z"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.1 0l2.3-2.3a5 5 0 0 0-7.1-7.1L11 4.9"/><path d="M14 11a5 5 0 0 0-7.1 0l-2.3 2.3a5 5 0 0 0 7.1 7.1L13 19.1"/>',
  file:'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  down:'<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  sub:'<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M6 14h5M6 10h12M14 14h4"/>',
  film:'<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M7 4v16M17 4v16M2.5 9h4.5M2.5 15h4.5M17 9h4.5M17 15h4.5"/>',
  repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
};
function libIco(n,s){
  const z=s||16;
  if(LIB_ICON[n]) return '<svg class="i" viewBox="0 0 24 24" width="'+z+'" height="'+z+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+LIB_ICON[n]+'</svg>';
  return svg(n,z);
}

/* ---------- IndexedDB：本地视频 / 音频文件持久化 ---------- */
const MediaDB={
  _p:null,
  open:function(){
    if(this._p) return this._p;
    this._p=new Promise(function(res,rej){
      if(!('indexedDB' in window)){ rej(new Error('IndexedDB unavailable')); return; }
      let req;
      try{ req=indexedDB.open('jingke_media_v1',1); }
      catch(e){ rej(e); return; }
      req.onupgradeneeded=function(){
        const db=req.result;
        if(!db.objectStoreNames.contains('files')) db.createObjectStore('files',{keyPath:'id'});
      };
      req.onsuccess=function(){ res(req.result); };
      req.onerror=function(){ rej(req.error||new Error('open failed')); };
    });
    return this._p;
  },
  put:function(id,blob,meta){
    return this.open().then(function(db){ return new Promise(function(res,rej){
      const t=db.transaction('files','readwrite');
      t.objectStore('files').put({id:id,blob:blob,name:(meta&&meta.name)||'',type:(meta&&meta.type)||'',ts:Date.now()});
      t.oncomplete=function(){ res(true); };
      t.onerror=function(){ rej(t.error||new Error('put failed')); };
      t.onabort=function(){ rej(t.error||new Error('put aborted')); };
    });});
  },
  get:function(id){
    return this.open().then(function(db){ return new Promise(function(res,rej){
      const t=db.transaction('files','readonly'), r=t.objectStore('files').get(id);
      r.onsuccess=function(){ res(r.result||null); };
      r.onerror=function(){ rej(r.error||new Error('get failed')); };
    });});
  },
  del:function(id){
    return this.open().then(function(db){ return new Promise(function(res){
      const t=db.transaction('files','readwrite');
      t.objectStore('files').delete(id);
      t.oncomplete=function(){ res(true); };
      t.onerror=function(){ res(false); };
    });});
  },
  keys:function(){
    return this.open().then(function(db){ return new Promise(function(res,rej){
      const t=db.transaction('files','readonly'), r=t.objectStore('files').getAllKeys();
      r.onsuccess=function(){ res(r.result||[]); };
      r.onerror=function(){ rej(r.error||new Error('keys failed')); };
    });}).catch(function(){ return []; });
  },
  clear:function(){
    return this.open().then(function(db){ return new Promise(function(res){
      const t=db.transaction('files','readwrite');
      t.objectStore('files').clear();
      t.oncomplete=function(){ res(true); };
      t.onerror=function(){ res(false); };
    });}).catch(function(){ return false; });
  }
};

/* ---------- 运行时状态（不落盘） ---------- */
const Lib={
  subs:null,          // 解析后的字幕 [{en,start,end}]
  mediaFile:null,     // 待导入的本地媒体 {file,name,size,type}
  textName:'',
  mediaURLs:{},       // blobId -> objectURL
  el:null, rate:1, ab:false, curSent:-1, missing:false,
  sampleLink:'https://weixin.qq.com/sph/A1BaBI04QR',
  manifest:null,      // 仓库 media/manifest.json 解析后的素材清单 [{title,file,type,subs,level}]
  manifestLoaded:false
};
/* 仓库里的视频：把 mp4/mp3 放进 media/ 目录，配一份 media/manifest.json，
   任意设备打开网站就能直接点「用这个建课」，无需逐台重新上传文件本体。
   相对路径同源，由 GitHub Pages 直接托管，跨设备天然可用。 */
function isRepoMedia(m){ return !!(m && m.url && /^media[/\\]/.test(m.url)); }
function libLoadMediaManifest(){
  if(Lib.manifestLoaded) return;
  Lib.manifestLoaded=true;
  fetch('media/manifest.json',{cache:'no-store'}).then(function(r){
    if(!r.ok) return null;
    return r.json().catch(function(){ return null; });
  }).then(function(j){
    if(!j||!Array.isArray(j.items)) return;
    Lib.manifest=j.items.filter(function(x){return x&&x.file;});
    if(R.view==='diy') paint();
  }).catch(function(){ /* 没有 manifest 是常态，静默忽略 */ });
}
function libResetForm(){ Lib.subs=null; Lib.mediaFile=null; Lib.textName=''; }

/* ---------- 字幕解析：SRT / VTT / LRC ---------- */
function libTime(s){
  const p=String(s||'').replace(',','.').split(':').map(parseFloat);
  if(p.length===3) return p[0]*3600+p[1]*60+p[2];
  if(p.length===2) return p[0]*60+p[1];
  return parseFloat(s)||0;
}
function parseSubs(raw){
  const txt=String(raw||'').replace(/\r/g,'').replace(/^\uFEFF/,'');
  const blocks=txt.split(/\n\s*\n/), out=[];
  blocks.forEach(function(b){
    const lines=b.split('\n').map(function(x){return x.trim();}).filter(Boolean);
    let ti=-1;
    for(let i=0;i<lines.length;i++) if(lines[i].indexOf('-->')>=0){ ti=i; break; }
    if(ti<0) return;
    const mm=lines[ti].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
    if(!mm) return;
    const en=lines.slice(ti+1).join(' ')
      .replace(/<[^>]*>/g,'').replace(/\{[^}]*\}/g,'').replace(/\[[^\]]*\]/g,'').trim();
    if(!en) return;
    out.push({en:en,start:libTime(mm[1]),end:libTime(mm[2])});
  });
  if(out.length) return out.slice(0,200);
  /* LRC：[00:12.30] lyric line */
  const lrc=[];
  txt.split('\n').forEach(function(line){
    const m=line.match(/^\[(\d{1,2}):(\d{2}(?:[.:]\d{1,3})?)\]\s*(.+)$/);
    if(m) lrc.push({en:m[3].trim(),start:parseInt(m[1],10)*60+libTime(m[2]),end:0});
  });
  for(let i=0;i<lrc.length;i++) lrc[i].end=lrc[i+1]?lrc[i+1].start:lrc[i].start+5;
  return lrc.slice(0,200);
}
function hasTimeline(l){
  return !!(l&&l.sentences&&l.sentences.length&&l.sentences[0].start!=null);
}
/* 自己的切句规则：不改动旧版 DIY 的 12 句上限，长文章最多取 60 句 */
function libSplit(t){
  return String(t||'').replace(/\r/g,'').replace(/([.!?。！？])\s+/g,'$1\n')
    .split(/\n+/).map(function(x){return x.trim();}).filter(Boolean).slice(0,60);
}

/* ---------- 外链识别 ---------- */
function classifyUrl(u){
  const s=String(u||'').trim();
  if(!s) return null;
  if(/weixin\.qq\.com\/sph|channels\.weixin\.qq\.com|finder\.video\.qq\.com/i.test(s))
    return {kind:'external',type:'',label:'微信视频号',note:'微信视频号不允许第三方网页内嵌播放，这里只保存链接。若能把视频另存为 mp4 上传，就能获得逐句跳转与单句循环。',url:s};
  if(/b23\.tv\//i.test(s)) return {kind:'external',type:'',label:'B站短链',url:s,note:'短链需要先打开拿到完整 BV 号才能内嵌；请改用 https://www.bilibili.com/video/BV… 形式的完整链接，或下载视频后上传 mp4。'};
  let m=s.match(/bilibili\.com\/video\/(BV[A-Za-z0-9]+)/i);
  if(m) return {kind:'embed',type:'iframe',label:'哔哩哔哩',embedUrl:'https://player.bilibili.com/player.html?bvid='+encodeURIComponent(m[1])+'&high_quality=1',url:s,note:'内嵌播放器由原站提供，网页无法读取播放进度，因此逐句跳转与单句循环不可用；可用下方「朗读」听发音。'};
  m=s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/i);
  if(m) return {kind:'embed',type:'iframe',label:'YouTube',embedUrl:'https://www.youtube.com/embed/'+encodeURIComponent(m[1]),url:s,note:'内嵌播放器由原站提供，网页无法读取播放进度。'};
  if(/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(s))
    return {kind:'url',type:'video',label:'视频直链',url:s,note:'跨域直链能否播放取决于对方服务器是否允许，失败时可把文件下载后改用「上传本地文件」。'};
  if(/\.(mp3|wav|m4a|aac|flac|opus)(\?|#|$)/i.test(s))
    return {kind:'url',type:'audio',label:'音频直链',url:s,note:'音频直链，可直接用于盲听与听写。'};
  return {kind:'external',type:'',label:'外部链接',url:s,note:'这个地址无法在网页内嵌播放，已保存为跳转链接。支持 mp4/mp3 直链、B站、YouTube；其它链接只作记录。'};
}

/* ---------- 生成课程数据 ---------- */
function libMakeLesson(title,items,cns,media){
  const sentences=items.map(function(it,i){
    const ws=wordsOf(it.en).filter(function(w){return w.length>4;}).slice(0,2);
    const s={en:it.en,cn:cns[i]||'（未提供中文对照，可在「我的素材库」里补充）',
      chunks:ws.length?ws.map(function(w){return {t:w,c:'来自你导入的素材，点词可查释义'};}):[{t:'自定义素材',c:'来自你导入的素材'}],
      note:'这是你自己导入的素材。点任意单词可查释义，逐句精讲可后续补充。'};
    if(it.start!=null){ s.start=it.start; s.end=it.end||0; }
    return s;
  });
  const timed=hasTimeline({sentences:sentences});
  const src=media?media.label:'粘贴的文章';
  return {
    title:title,cn:'我的素材',accent:'自定义 · MY LIBRARY',minutes:Math.max(5,Math.min(60,sentences.length*2)),
    quiz:{q:(media?'看完 / 听完':'读完')+'这段后自评：你能说出它的大意吗？',
      options:['能说出大意和主要信息','只抓住了几个词','基本没听懂'],answer:0,
      explain:'这是自评题，不计入评分。盲听的目标是抓大意，不必听懂每个词。'},
    sentences:sentences,expressions:[],
    summary:'你导入的素材（'+src+'），共 '+sentences.length+' 句'+(timed?'，带时间轴，可逐句跳转与单句循环':'')+'，已进入同一套六步学习流程。'
  };
}
function libMediaLabel(m){
  if(!m||m.kind==='none') return '纯文本';
  if(m.kind==='file') return (m.type==='audio'?'本地音频':'本地视频');
  if(m.kind==='embed') return m.label+' 内嵌';
  if(m.kind==='url') return isRepoMedia(m)?(m.type==='audio'?'仓库音频':'仓库视频'):m.label;
  return m.label+'（仅跳转）';
}
function libSourceTag(m){
  if(!m) return '文章';
  if(m.kind==='file') return m.type==='audio'?'音频':'视频';
  if(m.kind==='url') return isRepoMedia(m)?(m.type==='audio'?'音频':'视频'):(m.type==='audio'?'音频':'视频');
  if(m.kind==='embed') return '内嵌视频';
  if(m.kind==='external') return '外链';
  return '文章';
}

/* ---------- 页面：我的素材库 ---------- */
function libManifestHTML(){
  if(!Lib.manifest||!Lib.manifest.length) return '';
  const items=Lib.manifest.map(function(x,i){
    const isAudio=/\.(mp3|wav|m4a|aac|flac|opus)(\?|#|$)/i.test(x.file);
    return '<div class="repo-item'+(isAudio?' audio':'')+'">'+
      '<div class="ri-top"><span class="lib-kind '+(isAudio?'audio':'media')+'">'+(isAudio?'音频':'视频')+'</span>'+
        (x.level?'<span class="li-level">'+esc(x.level)+'</span>':'')+'</div>'+
      '<div class="ri-title">'+esc(x.title||x.file)+'</div>'+
      '<div class="ri-file">'+libIco('file',11)+' '+esc(x.file)+'</div>'+
      (x.subs?'<div class="ri-subs">'+libIco('clock',11)+' 含字幕 '+esc(x.subs)+'</div>':'')+
      '<div class="ri-acts"><button class="mini-btn" data-act="libUseRepo" data-i="'+i+'">用这个建课</button></div>'+
    '</div>';
  }).join('');
  return '<div class="card repo-media">'+
    '<div><div class="eyebrow">REPO MEDIA · 仓库里的素材</div>'+
      '<div class="sec-title" style="font-size:17px">放在 media/ 目录的视频 / 音频</div>'+
      '<p>这些文件随网站一起托管在 GitHub Pages，<b>任意设备打开同一网址就能直接建课播放</b>，不必逐台重新上传。想新增素材，把文件放进 <code>media/</code> 目录并在 <code>media/manifest.json</code> 登记即可（见仓库根目录说明）。</p></div>'+
    '<div class="repo-grid">'+items+'</div>'+
  '</div>';
}
function renderMyLib(){
  const list=S.diy||[];
  libLoadMediaManifest();
  return ''+
  '<section class="lib-hero">'+
    '<div class="lib-hero-top"><span>MY LIBRARY · 我的素材库</span><span>BUILD YOUR OWN COURSE</span></div>'+
    '<h1>把你自己找的材料，<em>做成一门课</em></h1>'+
    '<p>一段视频、一份字幕、一篇喜欢的文章——导入后立刻进入同一套六步：盲听、听写、核对、查解、跟读、背诵。文件只存在这台设备的浏览器里。</p>'+
    '<div class="lib-srcs">'+
      '<div class="lib-src">'+libIco('file',20)+'<b>文章</b><span>粘贴 / 上传 txt、md</span></div>'+
      '<div class="lib-src">'+libIco('sub',20)+'<b>字幕</b><span>srt、vtt、lrc 带时间轴</span></div>'+
      '<div class="lib-src">'+libIco('video',20)+'<b>视频 / 音频</b><span>本地文件、直链、B站、YouTube</span></div>'+
    '</div>'+
    '<div class="lib-hero-cta">'+
      '<button class="btn btn-gold btn-lg" data-act="gotoImport">'+libIco('video',16)+' 导入视频 / 音频</button>'+
      '<span class="lib-hero-hint">可直接把文件<b>拖到下方上传框</b> · 也可粘贴 mp4 / B站 / YouTube 链接</span>'+
    '</div>'+
  '</section>'+

  '<div class="sec-head" style="margin-top:24px"><div><div class="sec-kicker">STEP 01 · IMPORT</div>'+
    '<h2 class="sec-title">导入一份新素材</h2>'+
    '<div class="sec-sub">文字和媒体可以任意组合：只有文章也能学；有字幕 + 视频可以逐句跳转、单句循环。</div></div></div>'+

  '<div class="card lib-form">'+
    '<div class="lib-form-row">'+
      '<div class="field"><label>课程标题</label><input id="libTitle" placeholder="例如：My Favourite Talk / 第 101 期演示视频" value=""></div>'+
      '<div class="field" style="max-width:210px"><label>难度档（只作标记，不限制学习）</label><select id="libLevel">'+
        LEVELS.map(function(l){return '<option value="'+l.code+'">'+l.code+' · '+l.name+'</option>';}).join('')+'</select></div>'+
    '</div>'+

    '<div class="field"><label>英文原文 · 一句一行，或用句号分隔</label>'+
      '<textarea class="diy-area" id="libEn" placeholder="Paste your English passage here. One sentence per line.&#10;也可以留空，改从下方上传字幕文件（srt / vtt），会自动带出时间轴。"></textarea></div>'+
    '<div class="field"><label>中文对照 · 可选，按行对应；留空会明确标注「未提供」，不会自动编造译文</label>'+
      '<textarea class="diy-area" id="libCn" style="min-height:78px;font-family:var(--sans)" placeholder="第一行对应第一句，第二行对应第二句……"></textarea></div>'+

    '<div class="lib-uploads">'+
      '<div class="lib-up">'+
        '<div class="lib-up-h">'+libIco('file',15)+' <b>上传文章 / 字幕文件</b></div>'+
        '<p>支持 .txt .md .srt .vtt .lrc。字幕会自动解析成逐句时间轴。</p>'+
        '<input type="file" id="libTextFile" accept=".txt,.md,.srt,.vtt,.lrc,text/plain">'+
        '<div class="lib-file-note" id="libTextNote">未选择文件</div>'+
      '</div>'+
      '<div class="lib-up">'+
        '<div class="lib-up-h">'+libIco('video',15)+' <b>上传视频 / 音频</b></div>'+
        '<p>mp4、webm、mp3、m4a 等。文件保存在本机浏览器数据库，不上传服务器。</p>'+
        '<input type="file" id="libMediaFile" accept="video/*,audio/*,.mp4,.webm,.mov,.m4v,.mp3,.m4a,.wav,.ogg">'+
        '<div class="lib-file-note" id="libMediaNote">未选择文件</div>'+
      '</div>'+
    '</div>'+

    '<div class="field" style="margin-top:16px"><label>或者粘贴视频 / 音频链接</label>'+
      '<input id="libVideoUrl" placeholder="mp4 直链、media/xxx.mp4 仓库相对路径、B站、YouTube">'+
      '<div class="lib-link-row">'+
        '<button class="mini-btn" data-act="libUseSph" title="把这条视频号链接填入输入框">'+libIco('link',12)+' 用这条视频号链接</button>'+
        '<span>直链 / 仓库相对路径（如 <code>media/sample.mp4</code>）可逐句跳转；微信视频号只作跳转记录。</span>'+
      '</div></div>'+

    '<div class="lib-submit">'+
      '<button class="btn btn-primary" data-act="libGen">'+svg('sparkle',15)+' 生成我的课程，进入六步</button>'+
      '<span>生成后可随时重命名、补中文对照、导出备份或删除。</span>'+
    '</div>'+
  '</div>'+

  '<div class="sec-head" style="margin-top:28px"><div><div class="sec-kicker">STEP 02 · MY COURSES</div>'+
    '<h2 class="sec-title">我导入的素材 · '+list.length+' 篇</h2>'+
    '<div class="sec-sub">和官方课程完全一样走六步，进度、听写草稿、词库共用同一套保存机制。</div></div>'+
    (list.length?'<button class="btn btn-line btn-sm" data-act="libExport">'+libIco('down',13)+' 导出备份</button>':'')+'</div>'+
  (list.length?'<div class="lib-grid">'+list.map(libItemHTML).join('')+'</div>':
    '<div class="card empty"><h3>还没有导入过素材</h3><p>在上面粘贴一段英文，或上传字幕 + 视频，就能生成属于你自己的第一课。</p></div>')+

  libManifestHTML()+

  '<div class="card lib-backup">'+
    '<div><div class="eyebrow">SYNC · 换设备接着学</div>'+
      '<div class="sec-title" style="font-size:17px">导出 / 导入学习档案</div>'+
      '<p>学习进度只存在<b>当前这台设备的浏览器里</b>，不会自动云同步。想在手机 / 另一台电脑接着学：在这里<b>导出学习档案</b>（含积分、六步进度、词库、生词本、闯关成绩、自制素材），把 JSON 传过去，再在另一台设备打开同一个网址<b>导入</b>即可。<b>本地视频 / 音频文件本体不会打包</b>，需自行保留原文件并重新选择一次。</p></div>'+
    '<div class="lib-backup-btns">'+
      '<button class="btn btn-line btn-sm" data-act="libExport">'+libIco('down',13)+' 导出学习档案</button>'+
      '<label class="btn btn-line btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">'+libIco('upload',13)+' 导入学习档案<input type="file" id="libBackupFile" accept=".json,application/json" hidden></label>'+
      '<button class="btn btn-line btn-sm" data-act="libCleanMedia">'+svg('trash',13)+' 清理孤立媒体文件</button>'+
    '</div>'+
  '</div>'+

  '<div class="notice" style="margin-top:16px">'+svg('compass',14)+' <b>关于「加视频」的实话：</b>本地上传的 mp4/webm 能完整播放、逐句跳转和单句循环；mp4/mp3 直链、<b>仓库相对路径（如 <code>media/sample.mp4</code>）</b>、B站与 YouTube 可内嵌，但网页读不到播放进度，逐句控制不可用（仓库路径需配套的 srt/vtt 字幕才有时间轴）；<b>微信视频号链接只能在微信里打开</b>，第三方网页拿不到视频流，所以只作跳转记录。想让视频号内容获得完整能力，请把视频另存为 mp4 后从上方上传；想让同一段视频在任意设备都不必重传，放进 <code>media/</code> 目录并登记清单最省事。素材版权归原作者，仅供个人学习使用。</div>';
}
function libItemHTML(c){
  const l=c.custom||{sentences:[]}, p=prog(c.id), m=c.media;
  const tag=libSourceTag(m), timed=hasTimeline(l);
  const cls=tag==='文章'?'text':(tag==='外链'?'link':'media');
  const pending=l.pendingText;
  const openBtn=pending
    ? '<button class="btn btn-primary btn-sm" data-act="libAddText" data-id="'+esc(c.id)+'">补充英文原文 '+svg('arrowRight',12)+'</button>'
    : '<button class="btn btn-primary btn-sm" data-act="libOpen" data-id="'+esc(c.id)+'">进入六步 '+svg('arrowRight',12)+'</button>';
  return '<div class="lib-item'+(pending?' pending':'')+'">'+
    '<div class="li-top"><span class="lib-kind '+cls+'">'+esc(tag)+'</span>'+
      '<span class="li-level">'+esc(c.level||'A2')+'</span></div>'+
    '<div class="li-title">'+esc(c.title)+'</div>'+
    (pending?'<div class="li-warn">⚠ 还没英文原文，六步里的盲听 / 听写 / 核对无法使用，请先「补充英文原文」</div>':'')+
    '<div class="li-meta">'+l.sentences.length+' 句 · '+esc(libMediaLabel(m))+
      (timed?' · '+libIco('clock',11)+' 带时间轴':'')+'</div>'+
    (m&&m.name?'<div class="li-file" title="'+esc(m.name)+'">'+libIco('file',11)+' '+esc(m.name)+'</div>':'')+
    '<div class="li-prog"><i style="width:'+(p.done.length/6*100)+'%"></i></div>'+
    '<div class="li-foot"><span>已练 '+p.done.length+' / 6 步</span></div>'+
    '<div class="li-acts">'+
      openBtn+
      '<button class="mini-btn" data-act="libRename" data-id="'+esc(c.id)+'" title="重命名">'+libIco('edit',12)+' 重命名</button>'+
      '<button class="mini-btn" data-act="libEditCn" data-id="'+esc(c.id)+'" title="补充中文对照">'+libIco('file',12)+' 中文对照</button>'+
      '<button class="mini-btn danger" data-act="libDel" data-id="'+esc(c.id)+'" title="删除">'+svg('trash',12)+'</button>'+
    '</div>'+
  '</div>';
}

/* ---------- 六步页：媒体播放器 ---------- */
function mediaPlayerHTML(){
  const c=getCourse(R.courseId), m=c&&c.media;
  if(!m||!m.kind||m.kind==='none') return '';
  const l=getLesson(R.courseId), blind=(R.step===0);
  const timed=hasTimeline(l);
  let stage='';
  if(m.kind==='file'||m.kind==='url'){
    stage=(m.type==='audio'
      ? '<audio id="jkMedia" controls preload="metadata" playsinline></audio>'
      : '<video id="jkMedia" controls preload="metadata" playsinline></video>');
  } else if(m.kind==='embed'){
    stage='<div class="media-frame"><iframe id="jkMediaFrame" src="'+esc(m.embedUrl)+'" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe></div>';
  } else {
    stage='<div class="media-external">'+libIco('link',26)+
      '<b>'+esc(m.label)+' · 需要在原平台打开</b>'+
      '<span>'+esc(m.note||'该链接无法在网页内嵌播放。')+'</span>'+
      '<button class="btn btn-line btn-sm" data-act="mediaOpenExternal">打开原链接 '+svg('arrowRight',12)+'</button></div>';
  }
  const canCtl=(m.kind==='file'||m.kind==='url');
  const ctl=canCtl?'<div class="media-ctl">'+
      '<button class="mini-btn" data-act="mediaPlay" id="jkMediaPlay">'+svg('play',13)+' 播放 / 暂停</button>'+
      '<button class="mini-btn" data-act="mediaPrev">'+svg('arrowLeft',12)+' 上一句</button>'+
      '<button class="mini-btn" data-act="mediaNext">下一句 '+svg('arrowRight',12)+'</button>'+
      '<button class="mini-btn '+(Lib.ab?'on':'')+'" data-act="mediaAB" id="jkMediaAB">'+libIco('repeat',12)+' 单句循环</button>'+
      [0.75,1,1.25].map(function(r){return '<button class="mini-btn media-rate '+(Lib.rate===r?'on':'')+'" data-act="mediaRate" data-r="'+r+'">'+r+'×</button>';}).join('')+
      '<span class="media-time" id="jkMediaTime">00:00 / 00:00</span>'+
    '</div>':'';
  const noSeek=(m.kind==='external'||m.kind==='embed'||!canCtl);
  const head=noSeek?'点句子用浏览器朗读 · 这类视频无法在网页里逐句定位':
    (timed?(blind?'逐句跳转 · 盲听阶段不显示原文':'点击句子跳到对应时间 · 自动高亮当前句'):
      '这份素材没有时间轴，点句子用浏览器朗读');
  const sents='<div class="media-sents"><div class="ms-head">'+head+'</div><div class="ms-list">'+
      l.sentences.map(function(s,i){
        const tm=(s.start!=null)?fmtTime(s.start):String(i+1).padStart(2,'0');
        return '<button class="media-sent" data-act="mediaSent" data-i="'+i+'" title="'+(blind?'跳转到这一句':esc(s.en))+'">'+
          '<span class="ms-t">'+esc(tm)+'</span><span class="ms-x">'+(blind?'第 '+(i+1)+' 句':esc(s.en))+'</span></button>';
      }).join('')+'</div></div>';
  return '<div class="media-box">'+
    '<div class="media-h"><div><div class="media-kicker">MY MEDIA · 我的素材</div>'+
      '<b>'+esc(libMediaLabel(m))+'</b>'+(m.name?'<span>'+esc(m.name)+'</span>':'')+'</div>'+
      '<span class="tag gold">'+(timed?'逐句可控':'无时间轴')+'</span></div>'+
    '<div class="media-stage">'+stage+'</div>'+ctl+
    (m.note&&canCtl?'<div class="media-note">'+esc(m.note)+'</div>':'')+
    sents+
    (timed&&canCtl?'<div class="media-caption" id="jkMediaCaption"><span class="mc-hint">字幕将随播放实时显示</span></div>':'')+
    (m&&m.kind==='file'?'<div class="media-auto">'+
      '<button class="mini-btn" data-act="libExtractSubs" data-id="'+esc(c.id)+'">提取内嵌字幕</button>'+
      '<button class="mini-btn" data-act="libDictate" data-id="'+esc(c.id)+'">语音听写</button>'+
      '<span class="media-auto-h">没字幕？自动提取试试</span></div>':'')+
    '<div class="media-tts"><button class="btn btn-line btn-sm" data-act="mediaTTS">'+svg('volume',13)+' 没有声音？用浏览器朗读当前句</button>'+
      '<span>录音、跟读、背诵步骤照常可用；语音合成是回落方案，不是原音。</span></div>'+
  '</div>';
}
function mediaEl(){ return document.querySelector('#jkMedia'); }
function pauseMedia(){
  const el=mediaEl();
  if(el&&!el.paused){ try{ el.pause(); }catch(e){} }
}
function mountMediaPlayer(){
  if(Lib.lastCourse!==R.courseId){
    Lib.lastCourse=R.courseId; Lib.ab=false; Lib.curSent=-1;
  }
  Lib.el=mediaEl(); Lib.missing=false;
  if(!Lib.el) return;
  const c=getCourse(R.courseId), m=c&&c.media;
  if(!m) return;
  Lib.el.playbackRate=Lib.rate;
  Lib.el.addEventListener('timeupdate',onMediaTime);
  Lib.el.addEventListener('loadedmetadata',onMediaTime);
  Lib.el.addEventListener('ended',function(){ const b=document.querySelector('#jkMediaPlay'); if(b) b.innerHTML=svg('play',13)+' 播放 / 暂停'; });
  if(m.kind==='url'){ Lib.el.src=m.url; return; }
  if(m.kind==='file'){
    if(Lib.mediaURLs[m.blobId]){ Lib.el.src=Lib.mediaURLs[m.blobId]; return; }
    MediaDB.get(m.blobId).then(function(rec){
      const cur=mediaEl();
      if(!cur||!rec||!rec.blob){ Lib.missing=true; const box=document.querySelector('.media-stage');
        if(box) box.insertAdjacentHTML('beforeend','<div class="media-missing">本地媒体文件已不在浏览器存储中（可能清过缓存或换了设备）。请在「我的素材库」删除后重新导入，或改用浏览器朗读。</div>');
        return; }
      Lib.mediaURLs[m.blobId]=URL.createObjectURL(rec.blob);
      cur.src=Lib.mediaURLs[m.blobId];
      cur.playbackRate=Lib.rate;
    }).catch(function(){
      const box=document.querySelector('.media-stage');
      if(box) box.insertAdjacentHTML('beforeend','<div class="media-missing">无法读取本地媒体存储，可改用浏览器朗读。</div>');
    });
  }
}
function updateMediaCaption(idx){
  const cap=document.querySelector('#jkMediaCaption'); if(!cap) return;
  const l=getLesson(R.courseId); if(!l) return; const ss=l.sentences||[];
  if(idx>=0&&ss[idx]){
    const s=ss[idx];
    cap.innerHTML='<b>'+esc(s.en)+'</b>'+(s.cn&&!/未提供/.test(s.cn)?'<small>'+esc(s.cn)+'</small>':'');
  } else {
    cap.innerHTML='<span class="mc-hint">字幕将随播放实时显示</span>';
  }
}
function onMediaTime(){
  const el=mediaEl(); if(!el||typeof el.currentTime!=='number') return;
  const t=el.currentTime;
  const tm=document.querySelector('#jkMediaTime');
  if(tm) tm.textContent=fmtTime(t)+' / '+fmtTime(el.duration||0);
  const l=getLesson(R.courseId); if(!l) return;
  const ss=l.sentences||[]; let idx=-1;
  for(let i=0;i<ss.length;i++){
    if(ss[i].start!=null&&t>=ss[i].start&&(t<(ss[i].end||ss[i].start+5))){ idx=i; break; }
  }
  Lib.curSent=idx;
  document.querySelectorAll('.media-sent').forEach(function(b){ b.classList.toggle('active',parseInt(b.dataset.i,10)===idx); });
  updateMediaCaption(idx);
  if(Lib.ab&&idx>=0&&ss[idx].end&&t>=ss[idx].end){
    try{ el.currentTime=ss[idx].start; }catch(e){}
  }
}
function mediaSentence(i){
  const l=getLesson(R.courseId); if(!l) return;
  const n=clamp(i,0,l.sentences.length-1), s=l.sentences[n], el=mediaEl();
  Lib.curSent=n;
  if(el&&s.start!=null){
    try{ el.currentTime=s.start; el.play().catch(function(){}); }catch(e){}
    const b=document.querySelector('#jkMediaPlay'); if(b) b.innerHTML=svg('pause',13)+' 暂停';
  } else {
    toast(timelineHint(l,el));
    playVoice(s.en);
  }
  document.querySelectorAll('.media-sent').forEach(function(b){ b.classList.toggle('active',parseInt(b.dataset.i,10)===n); });
  updateMediaCaption(n);
}
function timelineHint(l,el){
  if(!el) return '这是外部视频，网页无法控制播放进度；已用浏览器语音朗读这一句';
  if(!hasTimeline(l)) return '这份素材没有时间轴，已用浏览器语音朗读这一句；上传 srt/vtt 字幕即可逐句跳转';
  return '已用浏览器语音朗读这一句';
}

/* ---------- 事件：文件选择 / 拖拽 / 导入 / 管理 / 播放控制 ---------- */
function libHandleTextFile(f){
  if(!f) return;
  const rd=new FileReader();
  rd.onload=function(){
    const raw=String(rd.result||'');
    if(/\.(srt|vtt|lrc)$/i.test(f.name)){
      const subs=parseSubs(raw);
      if(!subs.length){ toast('字幕文件里没读到带时间轴的字幕，请检查格式'); Lib.subs=null; }
      else { Lib.subs=subs; Lib.textName=f.name;
        const en=document.querySelector('#libEn'); if(en) en.value=subs.map(function(x){return x.en;}).join('\n');
        toast('已解析 '+subs.length+' 句字幕，带时间轴');
        /* 仅上传了字幕（没同时选视频/链接）时，尝试自动匹配素材库里还没字幕的视频/音频课 */
        try{ libTryMatchSubs(f.name, subs); }catch(err){ /* 匹配失败不影响字幕读取 */ }
      }
    } else {
      Lib.subs=null; Lib.textName=f.name;
      const en=document.querySelector('#libEn'); if(en) en.value=raw.trim();
      toast('已读入 '+f.name+'，可继续补充中文对照');
    }
    const note=document.querySelector('#libTextNote');
    if(note) note.textContent=f.name+' · '+(f.size/1024).toFixed(1)+' KB'+(Lib.subs?' · '+Lib.subs.length+' 句字幕':'');
    const ti=document.querySelector('#libTitle');
    if(ti&&!ti.value.trim()) ti.value=f.name.replace(/\.[^.]+$/,'');
  };
  rd.readAsText(f,'utf-8');
}
function libHandleMediaFile(f){
  if(!f) return;
  Lib.mediaFile=f;
  const note=document.querySelector('#libMediaNote');
  if(note) note.textContent=f.name+' · '+(f.size/1024/1024).toFixed(1)+' MB · 仅存本机';
  const ti=document.querySelector('#libTitle');
  if(ti&&!ti.value.trim()) ti.value=f.name.replace(/\.[^.]+$/,'');
  toast('已选择媒体文件，点「生成我的课程」保存');
}
document.addEventListener('change',function(e){
  const t=e.target;
  if(t.id==='libTextFile'){ libHandleTextFile(t.files&&t.files[0]); }
  if(t.id==='libMediaFile'){ libHandleMediaFile(t.files&&t.files[0]); }
  if(t.id==='libBackupFile'){
    const f=t.files&&t.files[0]; if(!f) return;
    const rd=new FileReader();
    rd.onload=function(){
      try{
        const raw=JSON.parse(String(rd.result||'null'));
        /* 新版：完整学习档案（跨设备接力） */
        if(raw&&!Array.isArray(raw)&&raw.kind==='full-profile'&&raw.state){
          libRestoreProfile(raw.state);
        }
        /* 旧版或纯素材数组：只合并素材，不动本机进度 */
        else if(Array.isArray(raw)){
          const ids={}; (S.diy||[]).forEach(function(c){ ids[c.id]=1; });
          let n=0;
          raw.forEach(function(c){
            if(!c||!c.id||!c.custom||!c.custom.sentences||ids[c.id]) return;
            S.diy.push(c); ids[c.id]=1; n++;
          });
          save(); toast('已导入 '+n+' 篇素材（媒体文件需重新选择）'); paint();
        }
        else throw new Error('bad');
      }catch(err){ toast('备份文件不是有效的学习档案 JSON'); }
      t.value='';
    };
    rd.readAsText(f,'utf-8');
  }
});

/* ---------- 拖拽导入：把文件拖到上传框即可 ---------- */
document.addEventListener('dragover',function(e){
  const up=e.target&&e.target.closest?e.target.closest('.lib-up'):null;
  if(R.view==='diy'&&up){ e.preventDefault(); up.classList.add('drag'); }
});
document.addEventListener('dragleave',function(e){
  const up=e.target&&e.target.closest?e.target.closest('.lib-up'):null;
  if(up) up.classList.remove('drag');
});
document.addEventListener('drop',function(e){
  const up=e.target&&e.target.closest?e.target.closest('.lib-up'):null;
  if(R.view!=='diy'||!up) return;
  const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
  if(!f) return;
  e.preventDefault(); up.classList.remove('drag');
  if(up.querySelector('#libMediaFile')) libHandleMediaFile(f);
  else if(up.querySelector('#libTextFile')) libHandleTextFile(f);
});

function libGenerate(){
  const gv=function(sel){ const x=document.querySelector(sel); return x&&x.value?x.value.trim():''; };
  const title=gv('#libTitle'), en=gv('#libEn'), cn=gv('#libCn'), url=gv('#libVideoUrl');
  const lv=(document.querySelector('#libLevel')||{}).value||'A2';
  let items=[];
  if(Lib.subs&&Lib.subs.length) items=Lib.subs.slice();
  else items=libSplit(en).map(function(x){return {en:x};});
  const hasMedia=!!(Lib.mediaFile||classifyUrl(url));
  if(!items.length){
    if(hasMedia){
      /* 只有链接 / 视频、没有文字稿：允许先建占位课，之后补原文 */
      toast('已生成含媒体的课程 · 接下来请补充英文台词');
    } else {
      toast('请先粘贴英文原文，或上传文章 / 字幕文件'); return;
    }
  }
  if(items.length>=60) toast('材料较长，已取前 60 句；建议按段落拆成几课');
  const cns=String(cn||'').replace(/\r/g,'').split(/\n+/).map(function(x){return x.trim();}).filter(Boolean);
  const meta=LEVELS.find(function(x){return x.code===lv;})||LEVELS[2];
  const id='diy_'+Date.now();
  const link=classifyUrl(url);
  let media=link||{kind:'none',type:'',label:'纯文本'};
  let blobId=null;
  if(Lib.mediaFile){
    blobId='m_'+id;
    media={kind:'file',type:(/^audio\//.test(Lib.mediaFile.type)||/\.(mp3|wav|m4a|aac|flac|opus)$/i.test(Lib.mediaFile.name))?'audio':'video',
      label:(/^audio\//.test(Lib.mediaFile.type)?'本地音频':'本地视频'),
      name:Lib.mediaFile.name,size:Lib.mediaFile.size,mime:Lib.mediaFile.type,blobId:blobId,
      note:'文件保存在本机浏览器数据库中，不上传服务器。清理浏览器数据会一并删除。'};
  }
  const custom=libMakeLesson(title||'我的素材',items,cns,media);
  const isPending=hasMedia&&!items.length;   // 占位课：只有媒体/链接，待补原文
  if(isPending) custom.pendingText=true;
  const course={id:id,idx:'DIY',level:lv,levelName:meta.name,tone:meta.tone,
    title:title||'我的素材 · '+dstr(),cn:'我的素材',series:'我的素材 · '+libMediaLabel(media),
    custom:custom,media:media,created:Date.now()};
  const finish=function(){
    S.diy.push(course); save(); libResetForm();
    openCourse(course.id,0);
    if(isPending){
      /* 导入视频 / 链接但没台词：打开后直接弹窗引导补台词（两步引导） */
      setTimeout(function(){ try{ libAddText(course); }catch(e){} },60);
    } else {
      toast('已生成「'+course.title+'」，正在打开六步');
    }
  };
  if(Lib.mediaFile){
    MediaDB.put(blobId,Lib.mediaFile,{name:Lib.mediaFile.name,type:Lib.mediaFile.type})
      .then(finish)
      .catch(function(){
        /* IndexedDB 不可用时降级：本次会话仍可播放，刷新后需重新选择 */
        Lib.mediaURLs[blobId]=URL.createObjectURL(Lib.mediaFile);
        media.note='浏览器本地存储不可用，媒体仅在本次打开期间有效；刷新后请在素材库重新选择文件。';
        toast('本地存储不可用，媒体仅在本次会话有效');
        finish();
      });
  } else finish();
}
function libExport(){
  // 完整学习档案：进度、积分、词库、生词本、六步记录、SRS、闯关成绩、自制素材全都在内
  const payload={ app:'ai-language-lab', kind:'full-profile', version:1,
    exportedAt:new Date().toISOString(), state:S };
  const data=JSON.stringify(payload,null,2);
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download='ai-language-lab-'+dstr()+'.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); },1000);
  toast('已导出完整学习档案（含进度与素材，不含视频文件本体）');
}
/* 换设备接力：把另一台设备导出的档案恢复进本机 */
function libRestoreProfile(st){
  if(!st||typeof st!=='object') throw new Error('bad');
  // 发音相关属于「这台设备的偏好」，不随档案覆盖，避免把已配好的 Worker 地址清掉
  const devPrefs={ voiceURI:S.voiceURI, edgeUrl:S.edgeUrl, edgeVoice:S.edgeVoice, ttsEngine:S.ttsEngine };
  const merged=Object.assign({},S,st,devPrefs);
  if(!merged.edgeUrl && typeof DEFAULT_EDGE_URL!=='undefined') merged.edgeUrl=DEFAULT_EDGE_URL;
  merged.edgePresetV1=true;
  Object.keys(S).forEach(function(k){ delete S[k]; });
  Object.assign(S,merged);
  save();
  toast('已同步学习档案：进度、词库、素材都回来了（本地视频需重新选一次文件）');
  paint();
  return true;
}
function libCleanMedia(){
  MediaDB.keys().then(function(keys){
    const used={}; (S.diy||[]).forEach(function(c){ if(c.media&&c.media.blobId) used[c.media.blobId]=1; });
    const dead=keys.filter(function(k){ return !used[k]; });
    Promise.all(dead.map(function(k){ return MediaDB.del(k); })).then(function(){
      toast(dead.length?'已清理 '+dead.length+' 个孤立媒体文件':'没有需要清理的媒体文件');
    });
  });
}
/* ---------- 补充英文原文（链接 / 视频已导入、但缺台词的占位课） ---------- */
function libAddText(c){
  const sents=c.custom&&c.custom.sentences||[];
  const cur=sents.map(function(s){ return /^（未提供/.test(s.cn)?'':s.cn; }).join('\n');
  const enTxt=sents.map(function(s){ return s.en; }).join('\n');
  const isNew=!/</.test(enTxt);
  const autoBtns=(c.media&&c.media.kind==='file')?
    ('<div class="modal-auto"><div class="modal-auto-h">不想手动贴？自动提取试试：</div>'+
      '<div class="modal-auto-row">'+
        '<button class="btn btn-line btn-sm" data-act="libExtractSubs" data-id="'+esc(c.id)+'">提取视频内嵌字幕</button>'+
        '<button class="btn btn-line btn-sm" data-act="libDictate" data-id="'+esc(c.id)+'">语音听写转文字</button>'+
      '</div>'+
      '<div class="modal-auto-sub">内嵌字幕仅当视频本身带字幕轨；语音听写需联网、并共享标签页音频实时识别人声。</div></div>'):'';
  openModal(
    '<div class="modal-step">第 2 步 / 共 2 步 · 补充台词</div>'+
    '<h3>把这段视频 / 音频的台词贴进来</h3>'+
    '<p class="modal-sub">你导入的媒体已经建好并在播放了。六步里的<b>盲听 / 听写 / 核对</b>需要先有台词——'+
    '<b>视频号、外链、本地视频都无法自动抓取字幕</b>，这一步需要你手动把台词贴进来（一句一行）。'+
    '贴好后即可开启完整的六步学习。</p>'+
    '<div class="field"><label>英文台词 / 原文 · 一句一行</label>'+
      '<textarea id="libAddEn" class="diy-area" placeholder="第一句英文&#10;第二句英文">'+esc(enTxt)+'</textarea></div>'+
    '<div class="field"><label>中文对照 · 可选，按行对应</label>'+
      '<textarea id="libAddCn" class="diy-area" style="min-height:90px;font-family:var(--sans)" placeholder="第一行对应第一句">'+esc(cur)+'</textarea></div>'+
    autoBtns+
    '<div class="modal-actions"><button class="btn btn-line btn-sm" data-act="closeModal">稍后再说</button>'+
      '<button class="btn btn-primary btn-sm" data-act="libAddTextSave" data-id="'+esc(c.id)+'">保存英文原文，开启六步</button></div>'+
    (isNew?'<div class="modal-foot">没台词也能先听先看，但六步会停在「盲听」之前；建议现在就贴上，体验最完整。</div>':''));
}
function libAddTextSave(id){
  const c=S.diy.find(function(x){return x.id===id;}); if(!c) return true;
  const en=String((document.querySelector('#libAddEn')||{}).value||'').replace(/\r/g,'').trim();
  if(!en){ toast('请先粘贴英文原文'); return true; }
  const items=libSplit(en).map(function(x){return {en:x};});
  if(!items.length){ toast('没读到英文句子，请一句一行粘贴'); return true; }
  const cns=String((document.querySelector('#libAddCn')||{}).value||'').replace(/\r/g,'').split(/\n+/).map(function(x){return x.trim();}).filter(Boolean);
  c.custom=libMakeLesson(c.title,items,cns,c.media);
  if(c.custom.sentences.length>=60) toast('材料较长，已取前 60 句；建议按段落拆成几课');
  save(); closeModal(); paint(); toast('英文原文已补充，现在可以走六步了'); return true;
}

function handleLibAct(a,t,e){
  switch(a){
    case 'libUseSph': {
      const i=document.querySelector('#libVideoUrl');
      if(i){ i.value=Lib.sampleLink; i.focus(); }
      toast('已填入视频号链接：会保存为跳转链接，不能内嵌播放');
      return true;
    }
    case 'libUseRepo': {
      const i=parseInt(t.dataset.i,10);
      const x=Lib.manifest&&Lib.manifest[i];
      if(!x) return true;
      const ti=document.querySelector('#libTitle'), ui=document.querySelector('#libVideoUrl');
      const lv=document.querySelector('#libLevel');
      if(ti&&!ti.value.trim()) ti.value=x.title||x.file;
      if(ui) ui.value=x.file;
      if(lv&&x.level) lv.value=x.level;
      /* 若清单里登记了字幕文件，自动拉取并解析，省去手动上传 */
      if(x.subs){
        fetch(x.subs,{cache:'no-store'}).then(function(r){return r.ok?r.text():null;}).then(function(txt){
          if(!txt) return;
          const subs=parseSubs(txt);
          if(subs.length){
            Lib.subs=subs;
            const en=document.querySelector('#libEn');
            if(en&&!en.value.trim()) en.value=subs.map(function(s){return s.en;}).join('\n');
            toast('已从仓库字幕 '+x.subs+' 解析出 '+subs.length+' 句时间轴');
          }
        }).catch(function(){});
      }
      toast('已填好「'+esc(x.title||x.file)+'」，点「生成我的课程」即可建课');
      const form=document.querySelector('.lib-form');
      if(form) form.scrollIntoView({behavior:'smooth',block:'center'});
      return true;
    }
    case 'libGen': libGenerate(); return true;
    case 'libOpen': {
      const c=S.diy.find(function(x){return x.id===t.dataset.id;});
      if(c&&c.custom&&c.custom.pendingText){ libAddText(c); return true; }
      openCourse(t.dataset.id,0); return true;
    }
    case 'libAddText': {
      const c=S.diy.find(function(x){return x.id===t.dataset.id;}); if(!c) return true;
      libAddText(c); return true;
    }
    case 'libAddTextSave': return libAddTextSave(t.dataset.id);
    case 'libExport': libExport(); return true;
    case 'libCleanMedia': libCleanMedia(); return true;
    case 'libRename': {
      const c=S.diy.find(function(x){return x.id===t.dataset.id;}); if(!c) return true;
      openModal('<h3>重命名素材</h3><p>只改标题，不影响学习进度。</p>'+
        '<input id="libEditTitle" value="'+esc(c.title)+'" style="width:100%">'+
        '<div class="modal-actions"><button class="btn btn-line btn-sm" data-act="closeModal">取消</button>'+
        '<button class="btn btn-primary btn-sm" data-act="libRenameSave" data-id="'+esc(c.id)+'">保存</button></div>');
      return true;
    }
    case 'libRenameSave': {
      const c=S.diy.find(function(x){return x.id===t.dataset.id;}); if(!c) return true;
      const ti=document.querySelector('#libEditTitle');
      const v=ti&&ti.value?ti.value.trim():'';
      if(!v){ toast('标题不能为空'); return true; }
      c.title=v; if(c.custom) c.custom.title=v; save(); closeModal(); paint(); toast('已重命名'); return true;
    }
    case 'libEditCn': {
      const c=S.diy.find(function(x){return x.id===t.dataset.id;}); if(!c) return true;
      const cur=(c.custom&&c.custom.sentences||[]).map(function(s){return /^（未提供/.test(s.cn)?'':s.cn;}).join('\n');
      openModal('<h3>补充中文对照</h3><p>一行对应一句，共 '+(c.custom?c.custom.sentences.length:0)+' 句。留空的行会标注「未提供中文对照」，不会自动翻译。</p>'+
        '<textarea id="libEditCn" class="diy-area" style="min-height:170px;font-family:var(--sans)" placeholder="第一句译文&#10;第二句译文">'+esc(cur)+'</textarea>'+
        '<div class="modal-actions"><button class="btn btn-line btn-sm" data-act="closeModal">取消</button>'+
        '<button class="btn btn-primary btn-sm" data-act="libEditCnSave" data-id="'+esc(c.id)+'">保存</button></div>');
      return true;
    }
    case 'libEditCnSave': {
      const c=S.diy.find(function(x){return x.id===t.dataset.id;}); if(!c||!c.custom) return true;
      const lines=String((document.querySelector('#libEditCn')||{}).value||'').replace(/\r/g,'').split('\n');
      c.custom.sentences.forEach(function(s,i){
        s.cn=(lines[i]||'').trim()||'（未提供中文对照，可在「我的素材库」里补充）';
      });
      save(); closeModal(); paint(); toast('中文对照已保存'); return true;
    }
    case 'libDel': {
      openModal('<h3>删除这份素材？</h3><p>会同时删除它的六步进度与听写草稿；本地保存的媒体文件也会一并清理。此操作不可撤销。</p>'+
        '<div class="modal-actions"><button class="btn btn-line btn-sm" data-act="closeModal">取消</button>'+
        '<button class="btn btn-primary btn-sm" data-act="libDelOk" data-id="'+esc(t.dataset.id)+'">确认删除</button></div>');
      return true;
    }
    case 'libDelOk': {
      const id=t.dataset.id, c=S.diy.find(function(x){return x.id===id;});
      if(c&&c.media&&c.media.blobId){
        MediaDB.del(c.media.blobId);
        if(Lib.mediaURLs[c.media.blobId]){ try{ URL.revokeObjectURL(Lib.mediaURLs[c.media.blobId]); }catch(err){} delete Lib.mediaURLs[c.media.blobId]; }
      }
      S.diy=S.diy.filter(function(x){return x.id!==id;});
      delete S.steps[id]; delete S.dict[id]; delete S.quiz[id]; delete S.listen[id];
      S.completed=S.completed.filter(function(x){return x!==id;});
      S.qCompleted=(S.qCompleted||[]).filter(function(x){return x!==id;});
      if(S.current===id) S.current=null;
      save(); closeModal(); paint(); toast('已删除这份素材'); return true;
    }
    /* ---- 媒体播放器控制 ---- */
    case 'libMatchApply': return libApplySubsToCourse(t.dataset.id);
    case 'libMatchNew': return libKeepAsNewSubs();
    case 'libExtractSubs': { const c=S.diy.find(function(x){return x.id===t.dataset.id;}); if(c) libExtractEmbeddedSubs(c); return true; }
    case 'libDictate': { const c=S.diy.find(function(x){return x.id===t.dataset.id;}); if(c) libStartDictation(c); return true; }
    case 'libDictateStop': return libDictateStop();
    case 'libDictateStart': return libDictateStart();
    case 'mediaPlay': {
      const el=mediaEl();
      if(!el){ toast('外部视频不能在这里控制，请到原平台观看，或用「朗读」听发音'); return true; }
      if(el.paused) el.play().then(function(){ t.innerHTML=svg('pause',13)+' 暂停'; }).catch(function(){ toast('播放失败：检查文件格式，或改用浏览器朗读'); });
      else { el.pause(); t.innerHTML=svg('play',13)+' 播放 / 暂停'; }
      return true;
    }
    case 'mediaPrev': mediaSentence((Lib.curSent<0?0:Lib.curSent)-1); return true;
    case 'mediaNext': mediaSentence((Lib.curSent<0?0:Lib.curSent)+1); return true;
    case 'mediaSent': mediaSentence(parseInt(t.dataset.i,10)); return true;
    case 'mediaAB': {
      const l=getLesson(R.courseId);
      if(!mediaEl()||!hasTimeline(l)){ toast('单句循环需要带时间轴的字幕（srt / vtt）；这份素材暂不支持'); return true; }
      Lib.ab=!Lib.ab; t.classList.toggle('on',Lib.ab);
      toast(Lib.ab?'已开启单句循环：播完当前句自动回到句首':'已关闭单句循环');
      if(Lib.ab) mediaSentence(Lib.curSent<0?0:Lib.curSent);
      return true;
    }
    case 'mediaRate': {
      Lib.rate=parseFloat(t.dataset.r)||1;
      const el=mediaEl(); if(el) el.playbackRate=Lib.rate;
      document.querySelectorAll('.media-rate').forEach(function(b){ b.classList.toggle('on',parseFloat(b.dataset.r)===Lib.rate); });
      return true;
    }
    case 'mediaTTS': {
      const l=getLesson(R.courseId); if(!l) return true;
      const i=clamp(Lib.curSent<0?0:Lib.curSent,0,l.sentences.length-1);
      playVoice(l.sentences[i].en); toast('浏览器语音朗读第 '+(i+1)+' 句'); return true;
    }
    case 'mediaOpenExternal': {
      const c=getCourse(R.courseId), m=c&&c.media;
      if(m&&m.url) window.open(m.url,'_blank','noopener,noreferrer');
      return true;
    }
  }
  return false;
}

/* ---------- 上传字幕后自动匹配已有视频 / 音频 ---------- */
/* 判断一门本地媒体课是否“还缺字幕”（可匹配） */
function libSubsMissing(c){
  if(!c||!c.media||c.media.kind!=='file') return false;
  if(!c.custom) return false;
  if(c.custom.pendingText) return true;                 // 占位课：只有媒体、还没台词
  return !hasTimeline(c.custom);                          // 有媒体但句子不带时间轴
}
/* 仅上传字幕（没同时选视频/链接）时，尝试匹配素材库里缺字幕的媒体课 */
function libTryMatchSubs(name, subs){
  const urlEl=document.querySelector('#libVideoUrl');
  if(Lib.mediaFile||(urlEl&&urlEl.value&&urlEl.value.trim())) return;   // 用户想和视频一起生成新课
  const cands=(S.diy||[]).filter(libSubsMissing);
  if(!cands.length){
    toast('已读取 '+subs.length+' 句字幕 · 可上传视频生成带字幕课程，或单独生成字幕课');
    return;
  }
  Lib._pendingSubs=subs; Lib._pendingName=name;
  const head='<div class="modal-step">字幕匹配</div>'+
    '<h3>把这份字幕（'+subs.length+' 句）匹配到哪门视频 / 音频？</h3>'+
    '<p class="modal-sub">素材库里有 '+(cands.length===1?'一门还没带字幕的视频 / 音频课':'几门还没带字幕的视频 / 音频课')+
    '。选一门就会把这份字幕接上去，立刻获得逐句跳转与单句循环。都不想匹配就选「单独生成字幕课」。</p>';
  if(cands.length===1){
    const c=cands[0];
    openModal(head+
      '<div class="match-list"><div class="match-card" data-act="libMatchApply" data-id="'+esc(c.id)+'">'+
        '<span class="match-ico">'+libIco(c.media.type==='audio'?'file':'video',18)+'</span>'+
        '<div><div class="match-title">'+esc(c.title)+'</div>'+
        '<div class="match-meta">'+libMediaLabel(c.media)+' · 当前还没字幕</div></div></div></div>'+
      '<div class="modal-actions"><button class="btn btn-line btn-sm" data-act="libMatchNew">单独生成字幕课</button>'+
      '<button class="btn btn-primary btn-sm" data-act="libMatchApply" data-id="'+esc(c.id)+'">匹配到这门课</button></div>');
  } else {
    let list='';
    cands.slice(0,8).forEach(function(c){
      list+='<div class="match-card" data-act="libMatchApply" data-id="'+esc(c.id)+'">'+
        '<span class="match-ico">'+libIco(c.media.type==='audio'?'file':'video',18)+'</span>'+
        '<div><div class="match-title">'+esc(c.title)+'</div>'+
        '<div class="match-meta">'+libMediaLabel(c.media)+' · 当前还没字幕</div></div></div>';
    });
    openModal(head+'<div class="match-list">'+list+'</div>'+
      '<div class="modal-actions"><button class="btn btn-line btn-sm" data-act="libMatchNew">单独生成字幕课</button></div>');
  }
}
/* 把暂存的字幕写进指定课程，重建带时间轴的句子 */
function libApplySubsToCourse(id){
  const c=S.diy.find(function(x){return x.id===id;});
  if(!c||!Lib._pendingSubs) return true;
  const subs=Lib._pendingSubs;
  c.custom=libMakeLesson(c.title,subs,[],c.media);
  c.pendingText=false; if(c.custom) c.custom.pendingText=false;
  c.series='我的素材 · '+libMediaLabel(c.media);
  save(); closeModal();
  Lib.subs=null; Lib._pendingSubs=null; Lib._pendingName=null;
  paint(); openCourse(id,0);
  toast('已为「'+c.title+'」匹配 '+subs.length+' 句字幕');
  return true;
}
/* 不匹配，保留字幕供用户单独生成或再上传视频 */
function libKeepAsNewSubs(){
  closeModal(); Lib._pendingSubs=null; Lib._pendingName=null;
  toast('已保留字幕：上传视频即可生成带字幕课程，或直接生成字幕课');
  return true;
}

/* ---------- 自动提取视频文字：① 读取内嵌字幕轨（mp4/m4v/mov） ---------- */
function libExtractEmbeddedSubs(c){
  if(!c||!c.media||c.media.kind!=='file'){ toast('只有本机上传的视频才能提取内嵌字幕'); return; }
  if(typeof MP4Box==='undefined'){ toast('字幕解析库未加载，请刷新页面重试；或改用上传 srt / 语音听写'); return; }
  if(!/\.(mp4|m4v|mov)$/i.test(c.media.name||'')){ toast('内嵌字幕提取目前只支持 mp4 / m4v / mov 容器；其它格式请用语音听写或上传 srt'); return; }
  toast('正在读取本地视频并尝试提取内嵌字幕…');
  MediaDB.get(c.media.blobId).then(function(rec){
    if(!rec||!rec.blob){ toast('找不到本地视频文件，请重新导入'); return; }
    const rd=new FileReader();
    rd.onload=function(){ try{ extractSubsFromBuffer(rd.result, c); }catch(e){ toast('解析出错：'+(e&&e.message||e)); } };
    rd.onerror=function(){ toast('读取本地视频失败'); };
    rd.readAsArrayBuffer(rec.blob);
  }).catch(function(){ toast('读取本地存储失败'); });
}
function extractSubsFromBuffer(buf, c){
  const file=MP4Box.createFile();
  let done=false;
  const finish=function(msg){ if(done) return; done=true; if(msg) toast(msg); };
  file.onError=function(){ finish('视频解析出错，可能不带字幕轨'); };
  file.onReady=function(info){
    if(done) return;
    const sub=info.tracks.find(function(t){ return t.handler==='subt' || /wvtt|tx3g|stpp|sbtl/i.test(t.codec||''); });
    if(!sub){ finish('这个视频没有可提取的内嵌字幕轨（常见于实拍 / 下载的无字幕视频）。可改用语音听写，或上传 srt'); return; }
    file.setExtractionOptions(sub.id, null, { nbSamples: 1000 });
    file.start();
  };
  file.onSamples=function(id, user, samples){
    if(done) return;
    const codec=(file.getTrackById&&file.getTrackById(id)&&file.getTrackById(id).codec)||'wvtt';
    const out=[];
    samples.forEach(function(s){
      const txt=decodeSubSample(s.data, codec);
      if(txt){
        const ts=s.timescale||1000, start=(s.cts!=null?s.cts:(s.dts||0))/ts, dur=(s.duration||0)/ts;
        out.push({en:txt, start:start, end:start+dur});
      }
    });
    if(out.length){ done=true; applyExtractedSubs(c, out); }
  };
  try{ buf.fileStart=0; file.appendBuffer(buf); file.flush(); }catch(e){ finish('解析失败：'+(e&&e.message||e)); return; }
  setTimeout(function(){ finish('未在视频中找到可识别的内嵌字幕轨'); }, 9000);
}
function utf8Of(buf,start,end){
  const ab=(buf instanceof ArrayBuffer)?buf:buf.buffer;
  return new TextDecoder('utf-8').decode(new Uint8Array(ab, buf.byteOffset+start, Math.max(0,end-start)));
}
function decodeSubSample(data, codec){
  if(!data) return '';
  try{ return /wvtt/i.test(codec)?decodeWvtt(data):decodeTx3g(data); }
  catch(e){ return ''; }
}
function decodeWvtt(buf){
  const ab=(buf instanceof ArrayBuffer)?buf:buf.buffer;
  const dv=new DataView(ab, buf.byteOffset||0, buf.byteLength);
  let off=0, text='';
  while(off+8<=buf.byteLength){
    const size=dv.getUint32(off), type=String.fromCharCode(dv.getUint8(off+4),dv.getUint8(off+5),dv.getUint8(off+6),dv.getUint8(off+7));
    if(size<8){ break; }
    const ps=off+8, pe=off+size;
    if(type==='c_st'){ text+=(text?' ':'')+utf8Of(buf,ps,pe); }
    off+=size;
  }
  return text.trim();
}
function decodeTx3g(buf){
  const ab=(buf instanceof ArrayBuffer)?buf:buf.buffer;
  const dv=new DataView(ab, buf.byteOffset||0, buf.byteLength);
  let len=0; try{ len=dv.getUint16(0); }catch(e){ return ''; }
  let text=''; try{ text=utf8Of(buf,2,2+len); }catch(e){ return ''; }
  text=text.replace(/[\x00-\x1f]/g, " ").replace(/\s+/g, " ").trim();
  return text;
}
function applyExtractedSubs(c, subs){
  subs=subs.filter(function(s){return s.en&&s.en.trim();}).slice(0,200);
  if(!subs.length){ toast('找到了字幕轨，但没解析出可读文本（可能是图片字幕或特殊编码）'); return; }
  c.custom=libMakeLesson(c.title, subs, [], c.media);
  c.pendingText=false; if(c.custom) c.custom.pendingText=false;
  c.series='我的素材 · '+libMediaLabel(c.media);
  save(); closeModal(); paint();
  toast('已提取 '+subs.length+' 句内嵌字幕，现在可逐句跳转');
}

/* ---------- 自动提取视频文字：② 浏览器原生语音听写（SpeechRecognition） ---------- */
let _dict=null;
function libStartDictation(c){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast('当前浏览器不支持语音听写，请用桌面版 Chrome / Edge，或手动粘贴台词'); return; }
  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){
    toast('当前环境不支持「共享标签页音频」，请用桌面版 Chrome 打开本地址'); return;
  }
  closeModal();
  openCourse(c.id,0);                 // 打开六步页，使 #jkMedia 视频元素就绪
  openModal(
    '<div class="modal-step">语音听写 · 自动出字幕</div>'+
    '<h3>让网页边播边听，自动生成字幕</h3>'+
    '<p class="modal-sub">接下来会让你<b>共享当前标签页并勾选「共享音频」</b>，然后视频自动播放、浏览器实时把人声转成文字，并自动按时间轴写入，立刻能逐句跳转。'+
    '听写过程中你正常看视频即可；结束后点「停止并完成」。注意：这是浏览器原生识别，<b>需要联网</b>，准确率受口音影响。</p>'+
    '<div class="dict-status" id="dictStatus">点击「开始听写」后将请求共享标签页权限…</div>'+
    '<textarea id="dictText" class="diy-area" style="min-height:160px" placeholder="听写内容会实时出现在这里" readonly></textarea>'+
    '<div class="modal-actions"><button class="btn btn-primary btn-sm" data-act="libDictateStart">开始听写</button>'+
      '<button class="btn btn-line btn-sm" data-act="libDictateStop">停止并完成听写</button></div>'+
    '<div class="modal-foot">若不想授权，关闭弹窗后也可手动粘贴台词，或上传 srt / vtt。</div>'
  );
  _dict={c:c, rec:null, stream:null, segs:[], el:null, ready:false};
}
function libDictateStart(){
  if(!_dict) return true;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const el=mediaEl(); if(!el){ toast('请先打开这门视频课再听写'); return true; }
  const status=document.querySelector('#dictStatus');
  navigator.mediaDevices.getDisplayMedia({video:true, audio:true}).then(function(stream){
    const rec=new SR();
    rec.continuous=true; rec.interimResults=true; rec.lang='en-US';
    try{ rec.mediaStream=stream; }catch(e){ /* 退回麦克风 */ }
    const segs=_dict.segs;
    rec.onresult=function(ev){
      let interim='';
      for(let i=ev.resultIndex;i<ev.results.length;i++){
        const r=ev.results[i], txt=r[0].transcript;
        if(r.isFinal){
          const start=(typeof el.currentTime==='number')?el.currentTime:0;
          segs.push({en:txt.trim(), start:start}); interim='';
        } else { interim=txt; }
      }
      const ta=document.querySelector('#dictText');
      if(ta){ ta.value=segs.map(function(s){return s.en;}).join('\n')+(interim?('\n'+interim):''); ta.scrollTop=ta.scrollHeight; }
      if(status) status.textContent='正在听写… 已识别 '+segs.length+' 句';
    };
    rec.onerror=function(e){ if(status) status.textContent='识别提示：'+(e&&e.error||'unknown')+'（仍在继续）'; };
    rec.onend=function(){ if(status&&status.textContent.indexOf('完成')<0) status.textContent='识别已结束，可点「停止并完成」保存'; };
    _dict.rec=rec; _dict.stream=stream; _dict.el=el; _dict.ready=true;
    try{ el.play().catch(function(){}); }catch(e){}
    try{ rec.start(); }catch(e){ toast('听写启动失败：'+(e&&e.message||e)); }
    if(status) status.textContent='正在听写…';
  }).catch(function(e){
    toast('未获得共享音频权限，听写已取消（可手动粘贴台词）');
    if(status) status.textContent='未获得权限：'+ (e&&e.message||e);
  });
  return true;
}
function libDictateStop(){
  if(!_dict){ closeModal(); return true; }
  const d=_dict; _dict=null;
  try{ if(d.rec) d.rec.stop(); }catch(e){}
  try{ if(d.stream) d.stream.getTracks().forEach(function(t){t.stop();}); }catch(e){}
  try{ if(d.el) d.el.pause(); }catch(e){}
  const segs=d.segs.filter(function(s){return s.en&&s.en.trim();});
  if(!segs.length){ toast('这次没听写出内容，可重试或手动粘贴'); closeModal(); return true; }
  const dur=(d.el&&d.el.duration)?d.el.duration:0;
  const subs=segs.map(function(s,i){
    let end=(segs[i+1]&&segs[i+1].start>s.start)?segs[i+1].start:(s.start+4);
    if(dur&&end>dur) end=dur;
    return {en:s.en.trim(), start:s.start, end:end};
  });
  d.c.custom=libMakeLesson(d.c.title, subs, [], d.c.media);
  d.c.pendingText=false; if(d.c.custom) d.c.custom.pendingText=false;
  d.c.series='我的素材 · '+libMediaLabel(d.c.media);
  save(); closeModal(); paint(); openCourse(d.c.id,0);
  toast('已用语音听写生成 '+subs.length+' 句字幕');
  return true;
}
