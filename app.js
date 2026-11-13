/* ============================================================
   AI 语言实验室 · 六步学习法 —— 交互逻辑
   纯原生实现，无依赖、无构建；进度/草稿/词库保存在 localStorage
   录音仅保留在当前页面内存（对应手册 P8「录音只保留在当前页面」）
   ============================================================ */

/* ---------------- 图标 ---------------- */
const P = {
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  book:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/>',
  sparkle:'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m18.5 15.5.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4M8 22h8"/>',
  quote:'<path d="M9 7H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v1a3 3 0 0 1-3 3"/><path d="M20 7h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v1a3 3 0 0 1-3 3"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  star:'<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8 6.6 19.7l1.2-6.1L3.3 9.4l6.1-.8z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  play:'<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
  pause:'<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  volume:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8"/>',
  ear:'<path d="M6 9a6 6 0 1 1 12 0c0 3-2 4-3 5s-1 2-1 3a2 2 0 0 1-4 0"/><path d="M9 9a3 3 0 0 1 6 0"/>',
  arrowLeft:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  radio:'<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 19.1a10 10 0 0 0 0-14.2"/>',
  headphones:'<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="14" width="4" height="7" rx="2"/><rect x="18" y="14" width="4" height="7" rx="2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  upload:'<path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2.3 6"/><path d="M20 5v6h-6"/>',
  eye:'<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  robot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/><circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none"/>',
  board:'<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3M6 8h8M6 12h5"/>',
  flag:'<path d="M5 21V4M5 5h11l-2 3 2 3H5"/>',
  gamepad:'<path d="M7 8h10a5 5 0 0 1 5 5l-1 4a2.5 2.5 0 0 1-4.4 1.2L15 16H9l-1.6 2.2A2.5 2.5 0 0 1 3 17l-1-4a5 5 0 0 1 5-5z"/><path d="M7.5 11v3M6 12.5h3M16 12h.01M18 14h.01"/>',
  tank:'<rect x="3" y="10" width="13" height="7" rx="2"/><path d="M16 12h5M8 10V7h5v3M6 21h.01M10 21h.01M14 21h.01"/>',
  heart:'<path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7 2.6C19 15.4 12 20 12 20z"/>',
  bolt:'<path d="m13 2-8 12h6l-1 8 8-12h-6z"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  school:'<path d="m12 3 10 5-10 5L2 8z"/><path d="M6 10v6c0 1.7 2.7 3 6 3s6-1.3 6-3v-6"/>',
};
function svg(n, size){ const s=size||18; return '<svg class="i" viewBox="0 0 24 24" width="'+s+'" height="'+s+'">'+(P[n]||P.check)+'</svg>'; }
function mountIcons(root){ (root||document).querySelectorAll('[data-icon]').forEach(function(e){ if(!e.dataset.mounted){ e.innerHTML=svg(e.dataset.icon); e.dataset.mounted='1'; } }); }

/* ---------------- 工具 ---------------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function $(s,r){ return (r||document).querySelector(s); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(function(){t.classList.remove('show');},2300); }
function openModal(html){ $('#modal').innerHTML=html; $('#modalMask').classList.remove('hidden'); }
function closeModal(){ $('#modalMask').classList.add('hidden'); }
function wordsOf(s){ return (String(s||'').match(/[A-Za-z][A-Za-z']*/g)||[]); }
function norm(w){ return String(w||'').toLowerCase().replace(/^[^a-z]+/,'').replace(/[^a-z']+$/,''); }
function clickable(text){
  return String(text||'').split(/([A-Za-z][A-Za-z']*)/g).map(function(p){
    if(/^[A-Za-z][A-Za-z']*$/.test(p)) return '<span class="clickable-word" data-w="'+esc(norm(p))+'">'+esc(p)+'</span>';
    return esc(p);
  }).join('');
}
function glossary(w){
  const k=norm(w);
  return G[k] || {p:'',s:'—',d:'演示词库暂未收录该词。仍可加入词库，之后自行补充释义。'};
}
function fmtTime(sec){ sec=Math.max(0,Math.round(sec||0)); return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0'); }
function dstr(d){ const x=d||new Date(); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }
function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }

/* ---------------- 状态 ---------------- */
const KEY='jingke_english_v1';
/* 已部署的免费 Edge TTS Worker（微软在线神经语音），默认开箱即用；失败会自动回退浏览器原生 */
const DEFAULT_EDGE_URL='https://ailab-tts.1905068699.workers.dev';
const DEF={points:0,completed:[],qCompleted:[],steps:{},dict:{},weak:[],days:[],quiz:{},listen:{},
  sixMode:true,diy:[],track:'classic',srs:{},gate:{stars:{},best:0},tank:{best:0,plays:0},classroom:{},voiceURI:'',edgeUrl:DEFAULT_EDGE_URL,edgeVoice:'en-US-AriaNeural',ttsEngine:'auto'};
/* 旧存档里 steps[id] 是 {done:[]}；迁移成按轨道分开，旧进度归入「精练六步」 */
function loadState(){
  let o;
  try{ const raw=localStorage.getItem(KEY);
       o=Object.assign(JSON.parse(JSON.stringify(DEF)),raw?JSON.parse(raw):{}); }
  catch(e){ return JSON.parse(JSON.stringify(DEF)); }
  const st={};
  Object.keys(o.steps||{}).forEach(function(id){
    const v=o.steps[id];
    if(Array.isArray(v)) st[id]={classic:{done:v.slice()},quest:{done:[]}};
    else if(v&&Array.isArray(v.done)) st[id]={classic:{done:v.done.slice()},quest:{done:[]}};
    else if(v&&v.classic) st[id]=v;
    else st[id]={classic:{done:[]},quest:{done:[]}};
  });
  o.steps=st;
  if(!o.qCompleted) o.qCompleted=[];
  if(!o.srs) o.srs={};
  if(!o.gate) o.gate={stars:{},best:0};
  if(!o.gate.stars) o.gate.stars={};
  if(!o.tank) o.tank={best:0,plays:0};
  if(!o.classroom) o.classroom={};
  if(o.track!=='quest') o.track='classic';
  // 一次性迁移：老存档里 edgeUrl 为空（未部署时），补上已部署好的默认地址
  if(!o.edgePresetV1){
    if(!o.edgeUrl) o.edgeUrl=DEFAULT_EDGE_URL;
    o.edgePresetV1=true;
    try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){}
  }
  return o;
}
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
let S=loadState();
function isQuest(){ return S.track==='quest'; }
function activeSteps(){ return isQuest()?QUEST_STEPS:STEPS; }
function activeTrack(){ return TRACKS.find(function(t){return t.id===S.track;})||TRACKS[0]; }
function completedList(t){ const tr=t||S.track; return tr==='quest'?(S.qCompleted||(S.qCompleted=[])):S.completed; }
function setTrack(id){
  if(id!=='classic'&&id!=='quest') return;
  S.track=id; save();
  if(R.courseId) R.step=Math.min(5,prog(R.courseId).done.length);
  R.wordStart=0; hideWordPop();
  toast('已切换到「'+activeTrack().name+'」· 该轨道进度独立记录');
  closeModal(); paint();
}

const R={
  view:'home', courseId:null, step:0, dictSeg:0, wordStart:0, rate:1, loop:false,
  allowSkip:true, analysisTab:'全文对照', shadowMode:'sentence', shadowSeg:0,
  recitePass:0, reciteDone:[], levelFilter:'ALL', search:'',
  voiceDur:0, voiceKey:'', keepAudio:false,
  recordings:{}, scores:{}, reciteRecords:{}, timer:null, timerSec:0,
  /* 游戏化模块运行时状态（不落盘，刷新后重置到初始态） */
  classCourse:null, classSi:0, breakdownSeg:0,
  gate:{lv:1,qs:[],i:0,pick:null,correct:0,combo:0,finished:false,results:[]},
  lessonQuiz:{qs:[],i:0,pick:null,correct:0,finished:false},
  review:{queue:[],i:0,revealed:false,done:0},
  tankG:{running:false,paused:false,over:false,score:0,lives:3,wave:1,combo:0,
         enemies:[],bullets:[],q:null,raf:null,last:0,spawn:0,canvas:null,ctx:null},
};
function prog(id,t){
  const tr=t||S.track;
  if(!S.steps[id]) S.steps[id]={classic:{done:[]},quest:{done:[]}};
  const v=S.steps[id];
  if(Array.isArray(v)||Array.isArray(v.done)) S.steps[id]={classic:{done:(v.done||v).slice()},quest:{done:[]}};
  const x=S.steps[id];
  if(!x.classic) x.classic={done:[]}; if(!x.quest) x.quest={done:[]};
  if(!Array.isArray(x.classic.done)) x.classic.done=[];
  if(!Array.isArray(x.quest.done)) x.quest.done=[];
  return x[tr];
}
function markDone(id,n){ const p=prog(id); if(p.done.indexOf(n)<0){ p.done.push(n); S.points+=10; } if(S.days.indexOf(dstr())<0) S.days.push(dstr()); save(); }
function streak(){
  if(!S.days.length) return 0;
  let n=0, d=new Date();
  if(S.days.indexOf(dstr(d))<0) d.setDate(d.getDate()-1);
  while(S.days.indexOf(dstr(d))>=0){ n++; d.setDate(d.getDate()-1); }
  return n;
}
function addWeak(w,src){
  const k=norm(w); if(!k) return false;
  if(S.weak.some(function(x){return x.w===k;})) return false;
  const g=glossary(k);
  S.weak.unshift({w:k,p:g.p,pos:g.s,def:g.d,src:src||'',ts:Date.now()});
  save(); return true;
}
function getCourse(id){
  if(!id) return null;
  if(id.indexOf('diy_')===0) return S.diy.find(function(c){return c.id===id;})||null;
  return COURSES.find(function(c){return c.id===id;})||null;
}
function getLesson(id){ const c=getCourse(id); if(!c) return null; return c.custom||LESSONS[c.lessonKey]||LESSONS.hello; }
function allCourses(){ return COURSES.concat(S.diy); }
function sentenceText(l){ return l.sentences.map(function(s){return s.en;}).join(' '); }
function draftOf(id){
  const l=getLesson(id); if(!l) return [];
  if(!S.dict[id]) S.dict[id]=l.sentences.map(function(s){ return wordsOf(s.en).map(function(){return '';}); });
  return S.dict[id];
}
function activeCourseId(){ return R.courseId || (S.current||COURSES[0].id); }

/* ---------------- 语音合成（浏览器原生 TTS） ---------------- */
const Voice={playing:false,timer:null,keep:null,curText:''};
function voiceSupported(){ return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window; }

/* 声音优选：自动挑最自然的「在线神经语音」（微软 Aria / Jenny 等，几乎像真人），
   避开 David / Mark 这类老式离线机器人音；用户也可在声音面板里手动指定 */
let ALL_VOICES=[];
function refreshVoices(){ try{ ALL_VOICES=speechSynthesis.getVoices()||[]; }catch(e){ ALL_VOICES=[]; } }
function voiceScore(v){
  const n=((v&&v.name)||'')+' '+(v&&v.voiceURI||'');
  let s=0;
  if(/online|neural|natural/i.test(n)) s+=120;                                   // 微软在线神经语音：最接近真人
  if(/\b(aria|jenny|zira|samantha|daniel|karen|moira|tessa|victoria|libby|ryan|guy|anya|ava|andrew|emma|noelle|brian|christopher|eric|michelle|rohit|steffan|en[-_]us|en[-_]gb)\b/i.test(n)) s+=50;
  if(/google/i.test(n)) s+=25;
  if(/microsoft/i.test(n)) s+=15;
  if(/desktop|sapi|david|mark|hazel|george|susan|fred|hal|male|female\b/i.test(n)) s-=60; // 老式离线机器人音，降权
  return s;
}
function listEnglishVoices(){
  return (ALL_VOICES.length?ALL_VOICES:(speechSynthesis.getVoices()||[]))
    .filter(function(v){ return /^en/i.test(v.lang); })
    .sort(function(a,b){ return voiceScore(b)-voiceScore(a); });
}
function pickVoice(){
  const list=listEnglishVoices();
  if(!list.length) return null;
  if(S.voiceURI){ const hit=list.find(function(v){return v.voiceURI===S.voiceURI;}); if(hit) return hit; }
  return list[0];
}
function setVoiceURI(uri){ S.voiceURI=uri; save(); }

/* 微软 Edge 在线神经语音（免费、无需 key），前端通过 Cloudflare Worker 代理调用 */
const EDGE_VOICES=[
  {id:'en-US-AriaNeural',name:'Aria（女·温柔）'},
  {id:'en-US-JennyNeural',name:'Jenny（女·自然）'},
  {id:'en-US-SaraNeural',name:'Sara（女）'},
  {id:'en-US-JaneNeural',name:'Jane（女）'},
  {id:'en-US-NancyNeural',name:'Nancy（女）'},
  {id:'en-US-GuyNeural',name:'Guy（男·沉稳）'},
  {id:'en-US-DavisNeural',name:'Davis（男）'},
  {id:'en-US-JasonNeural',name:'Jason（男）'},
  {id:'en-US-TonyNeural',name:'Tony（男）'},
  {id:'en-GB-SoniaNeural',name:'Sonia（英式·女）'},
  {id:'en-GB-RyanNeural',name:'Ryan（英式·男）'},
  {id:'en-AU-NatashaNeural',name:'Natasha（澳式·女）'},
  {id:'en-CA-ClaraNeural',name:'Clara（加式·女）'}
];
function edgeRate(r){ const pct=Math.round((r-1)*100); return (pct>0?'+':'')+pct+'%'; }
function useEdgeEngine(){ return (S.ttsEngine==='edge' || (S.ttsEngine==='auto'&&!!S.edgeUrl)) && !!S.edgeUrl; }
function edgeBase(){ return (S.edgeUrl||'').replace(/\/+$/,''); }
function edgeAudioUrl(text,rate){
  return edgeBase()+'?text='+encodeURIComponent(text)+'&voice='+encodeURIComponent(S.edgeVoice||'en-US-AriaNeural')+'&rate='+encodeURIComponent(edgeRate(rate))+'&pitch=0%';
}
/* 音频元素单例（主播放器 / 短句各一个），Edge 模式下用它播放返回的 mp3 */
let AUDIO=null, SHORT_AUDIO=null, edgeWarned=false;
function audioEl(){ if(!AUDIO) AUDIO=new Audio(); return AUDIO; }
function shortAudioEl(){ if(!SHORT_AUDIO) SHORT_AUDIO=new Audio(); return SHORT_AUDIO; }
function stopAudio(){ const a=audioEl(); try{ a.pause(); }catch(e){} if(a._obj){ try{ URL.revokeObjectURL(a._obj); }catch(e){} a._obj=null; } }
function updateVoiceUI(p){
  const fill=$('#pbarFill'); if(fill) fill.style.width=(clamp(p,0,1)*100).toFixed(1)+'%';
  const tm=$('#pTime'); if(tm) tm.textContent=fmtTime(R.voiceDur*p)+' / '+fmtTime(R.voiceDur);
  const st=$('#pState'); if(st) st.textContent=Voice.playing?'正在播放…':'点击播放';
  document.querySelectorAll('.play-btn').forEach(function(b){ b.innerHTML=svg(Voice.playing?'pause':'play',20); b.classList.toggle('playing',Voice.playing); });
}
function stopVoice(){
  if(voiceSupported()) { try{ speechSynthesis.cancel(); }catch(e){} }
  stopAudio();
  Voice.playing=false; clearInterval(Voice.timer); clearInterval(Voice.keep);
  updateVoiceUI(0);
}
/* 浏览器原生 TTS（兜底） */
function playViaNative(text,onStart,onEnd){
  if(!voiceSupported()){ toast('当前浏览器不支持语音合成，请用 Chrome / Edge 打开'); if(onEnd) onEnd(); return; }
  const u=new SpeechSynthesisUtterance(text);
  u.lang='en-US'; u.rate=R.rate; u.pitch=1; u.volume=1;
  try{ const v=pickVoice(); if(v) u.voice=v; }catch(e){}
  const dur=Math.max(2,wordsOf(text).length*0.46/R.rate+0.8);
  R.voiceDur=dur; Voice.curText=text; Voice.playing=true;
  const t0=Date.now();
  Voice.timer=setInterval(function(){
    const p=clamp((Date.now()-t0)/1000/dur,0,1);
    updateVoiceUI(p);
    if(p>=1 && !speechSynthesis.speaking){ clearInterval(Voice.timer); }
  },120);
  u.onend=function(){
    Voice.playing=false; clearInterval(Voice.timer); clearInterval(Voice.keep); updateVoiceUI(1);
    if(onEnd) onEnd();
    if(R.loop){ setTimeout(function(){ if(R.loop&&R.view==='lesson') playVoice(text,onStart,onEnd); },350); }
  };
  u.onerror=function(){ Voice.playing=false; clearInterval(Voice.timer); updateVoiceUI(0); };
  try{ speechSynthesis.speak(u); }catch(e){ toast('播放失败：'+e.message); Voice.playing=false; }
  // Chrome 长文本约 15s 后自动暂停的兼容处理
  Voice.keep=setInterval(function(){ if(Voice.playing && speechSynthesis.speaking && !speechSynthesis.paused){ try{ speechSynthesis.pause(); speechSynthesis.resume(); }catch(e){} } },9000);
  if(onStart) onStart();
  updateVoiceUI(0);
}
/* 微软 Edge 在线 TTS（免费、近真人） */
function playViaEdge(text,onStart,onEnd){
  if(!S.edgeUrl) throw new Error('no edge url');
  const a=audioEl(); const obj=URL.createObjectURL(new Blob()); // 占位，真实对象在 fetch 后替换
  stopAudio();
  Voice.playing=true; Voice.curText=text; updateVoiceUI(0);
  return fetch(edgeAudioUrl(text,R.rate)).then(function(res){
    if(!res.ok) throw new Error('edge http '+res.status);
    return res.blob();
  }).then(function(blob){
    const real=URL.createObjectURL(blob);
    a._obj=real; a.src=real;
    a.onloadedmetadata=function(){ R.voiceDur=a.duration||0; updateVoiceUI(0); };
    a.ontimeupdate=function(){ const p=R.voiceDur?(a.currentTime/R.voiceDur):0; updateVoiceUI(clamp(p,0,1)); };
    a.onended=function(){ Voice.playing=false; updateVoiceUI(1); if(a._obj){ try{URL.revokeObjectURL(a._obj);}catch(e){} a._obj=null; } if(onEnd) onEnd(); if(R.loop){ setTimeout(function(){ if(R.loop&&R.view==='lesson') playVoice(text,onStart,onEnd); },350); } };
    a.onerror=function(){ Voice.playing=false; updateVoiceUI(0); if(a._obj){ try{URL.revokeObjectURL(a._obj);}catch(e){} a._obj=null; } };
    if(onStart) onStart();
    return a.play();
  });
}
/* 统一入口：能用 Edge 就用 Edge，否则回退浏览器原生 */
function playVoice(text,onStart,onEnd){
  stopVoice();
  if(!text){ toast('没有可播放的内容'); return; }
  if(useEdgeEngine()){
    playViaEdge(text,onStart,onEnd).catch(function(err){
      console.warn('Edge TTS 失败，回退浏览器发音：',err);
      if(!edgeWarned){ edgeWarned=true; toast('Edge TTS 暂不可用，已回退浏览器发音；可在 🎙 里检查地址或切回「浏览器原生」'); }
      playViaNative(text,onStart,onEnd);
    });
    return;
  }
  playViaNative(text,onStart,onEnd);
}
/* 短句/单词朗读：同样优先 Edge，失败回退原生 */
function speakShort(text,rate){
  rate=rate||0.85;
  if(useEdgeEngine()){
    try{
      return fetch(edgeAudioUrl(text,rate)).then(function(res){ if(!res.ok) throw new Error('http '+res.status); return res.blob(); }).then(function(blob){
        const a=shortAudioEl(); if(a._obj){ try{URL.revokeObjectURL(a._obj);}catch(e){} } const o=URL.createObjectURL(blob); a._obj=o; a.src=o; try{ a.play(); }catch(e){}
      });
    }catch(e){ /* 落到原生 */ }
  }
  const u=new SpeechSynthesisUtterance(text); u.lang='en-US'; u.rate=rate; u.pitch=1;
  try{ const v=pickVoice(); if(v) u.voice=v; }catch(e){} speechSynthesis.speak(u);
}
function voiceWords(){
  const l=getLesson(R.courseId); if(!l) return [];
  const q=isQuest();
  if(!q && R.step===1) return wordsOf(l.sentences[R.dictSeg].en);
  if(R.step===(q?1:4) && R.shadowMode==='sentence') return wordsOf(l.sentences[R.shadowSeg].en);
  return wordsOf(sentenceText(l));
}
function currentVoiceText(){
  const ws=voiceWords();
  return ws.slice(clamp(R.wordStart,0,Math.max(0,ws.length-1))).join(' ');
}
function togglePlay(){
  if(Voice.playing){ stopVoice(); return; }
  const id=R.courseId;
  playVoice(currentVoiceText(),function(){
    if(R.step===0 && id){ S.listen[id]=(S.listen[id]||0)+1; save(); }
  });
}

/* ---------------- 录音（MediaRecorder + 本地音量分析） ---------------- */
const Rec={active:null,mr:null,stream:null,chunks:[],ctx:null,analyser:null,raf:null,rms:[],t0:0};
function recSupported(){ return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder); }
function clearRecordings(){
  Object.keys(R.recordings).forEach(function(k){ try{ URL.revokeObjectURL(R.recordings[k].url); }catch(e){} });
  Object.keys(R.reciteRecords).forEach(function(k){ try{ URL.revokeObjectURL(R.reciteRecords[k].url); }catch(e){} });
  R.recordings={}; R.reciteRecords={}; R.scores={};
}
async function startRec(key){
  if(Rec.active){ await stopRec(); return; }
  if(!recSupported()){ toast('当前环境无法录音：请用 http://localhost 或 https 打开，并允许麦克风'); return; }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    Rec.stream=stream; Rec.chunks=[]; Rec.rms=[]; Rec.t0=Date.now(); Rec.active=key;
    let mime=''; try{ if(MediaRecorder.isTypeSupported('audio/webm')) mime='audio/webm'; }catch(e){}
    Rec.mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
    Rec.mr.ondataavailable=function(e){ if(e.data&&e.data.size) Rec.chunks.push(e.data); };
    Rec.mr.onstop=function(){
      const dur=(Date.now()-Rec.t0)/1000;
      const blob=new Blob(Rec.chunks,{type:Rec.mr.mimeType||'audio/webm'});
      const url=URL.createObjectURL(blob);
      const energy=Rec.rms.length?Rec.rms.reduce(function(a,b){return a+b;},0)/Rec.rms.length:0;
      const voiced=Rec.rms.length?Rec.rms.filter(function(v){return v>0.018;}).length/Rec.rms.length:0;
      storeRecording(key,{url:url,dur:dur,energy:energy,voiced:voiced,ts:Date.now()});
      try{ stream.getTracks().forEach(function(t){t.stop();}); }catch(e){}
      paint();
    };
    try{
      Rec.ctx=new (window.AudioContext||window.webkitAudioContext)();
      const src=Rec.ctx.createMediaStreamSource(stream);
      Rec.analyser=Rec.ctx.createAnalyser(); Rec.analyser.fftSize=1024;
      src.connect(Rec.analyser);
      const buf=new Uint8Array(Rec.analyser.fftSize);
      (function sample(){
        if(!Rec.active) return;
        Rec.analyser.getByteTimeDomainData(buf);
        let sum=0; for(let i=0;i<buf.length;i++){ const v=(buf[i]-128)/128; sum+=v*v; }
        Rec.rms.push(Math.sqrt(sum/buf.length));
        Rec.raf=requestAnimationFrame(sample);
      })();
    }catch(e){ /* 无 Web Audio 时仍可录音 */ }
    Rec.mr.start(); toast('录音中…再点一次结束'); paint();
  }catch(e){ toast('无法使用麦克风：'+(e.message||'权限被拒绝')); Rec.active=null; }
}
function stopRec(){
  return new Promise(function(res){
    if(!Rec.active||!Rec.mr){ res(); return; }
    Rec.active=null; cancelAnimationFrame(Rec.raf);
    try{ Rec.ctx&&Rec.ctx.close(); }catch(e){}
    try{ Rec.mr.stop(); }catch(e){}
    setTimeout(res,220);
  });
}
function storeRecording(key,data){
  if(key.indexOf('recite')===0){ R.reciteRecords[key]=data; return; }
  const l=getLesson(R.courseId);
  const si=parseInt(key.split('_')[1],10);
  const text=(R.shadowMode==='pass'||si<0)?sentenceText(l):(l.sentences[si]?l.sentences[si].en:'');
  const expected=Math.max(2,wordsOf(text).length*0.46);
  const accuracy=clamp(Math.round(100-Math.abs(data.dur-expected)/expected*100),0,100);
  const fluency=clamp(Math.round(data.voiced*100*(data.energy>0.006?1:0.5)),0,100);
  R.recordings[key]=data;
  R.scores[key]={complete:accuracy,fluency:fluency,overall:Math.round((accuracy+fluency)/2)};
}
function scoreHTML(sc){
  const label=sc.overall>=80?'很棒':sc.overall>=60?'不错':'再练一次';
  const col=sc.overall>=80?'var(--green)':sc.overall>=60?'var(--amber)':'var(--red)';
  return '<div class="score-bars">'+
    '<div class="sb"><div class="sb-k"><span>完整度</span><b>'+sc.complete+'</b></div><div class="sb-v" style="color:'+col+'">'+sc.complete+'</div><div class="sb-bar"><i style="width:'+sc.complete+'%;background:'+col+'"></i></div></div>'+
    '<div class="sb"><div class="sb-k"><span>流利度</span><b>'+sc.fluency+'</b></div><div class="sb-v" style="color:'+col+'">'+sc.fluency+'</div><div class="sb-bar"><i style="width:'+sc.fluency+'%;background:'+col+'"></i></div></div>'+
    '<div class="sb"><div class="sb-k"><span>准确度</span><b>待接入</b></div><div class="sb-v" style="color:var(--faint)">—</div><div class="sb-bar"><i style="width:0%"></i></div><div style="font-size:9.5px;color:var(--muted);margin-top:4px">需 ASR 语音识别</div></div>'+
    '</div><div style="font-size:11px;color:'+col+';font-weight:700;margin-top:9px">演示评分 '+sc.overall+' · '+label+'（依据录音时长与音量估算，非 AI 发音评测）</div>';
}

/* ---------------- 逐词比对（LCS） ---------------- */
function diffWords(ref,ans){
  const n=ref.length,m=ans.length;
  const dp=Array.from({length:n+1},function(){return new Uint16Array(m+1);});
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--)
    dp[i][j]=ref[i]===ans[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const ops=[]; let i=0,j=0;
  while(i<n&&j<m){
    if(ref[i]===ans[j]){ ops.push({t:'ok',w:ref[i]}); i++; j++; }
    else if(dp[i+1][j]>=dp[i][j+1]){ ops.push({t:'miss',w:ref[i]}); i++; }
    else { ops.push({t:'extra',w:ans[j]}); j++; }
  }
  while(i<n) ops.push({t:'miss',w:ref[i++]});
  while(j<m) ops.push({t:'extra',w:ans[j++]});
  const out=[];
  for(let k=0;k<ops.length;k++){
    if(ops[k].t==='miss'&&ops[k+1]&&ops[k+1].t==='extra'){ out.push({t:'err',w:ops[k].w,got:ops[k+1].w}); k++; }
    else out.push(ops[k]);
  }
  return out;
}
function diffAll(id){
  const l=getLesson(id), d=draftOf(id), rows=[];
  let total=0,correct=0; const weak=[];
  l.sentences.forEach(function(s,si){
    const ref=wordsOf(s.en).map(norm).filter(Boolean);
    const ans=(d[si]||[]).map(norm).filter(Boolean);
    const ops=diffWords(ref,ans);
    total+=ref.length;
    ops.forEach(function(o){ if(o.t==='ok') correct++; if(o.t==='miss'||o.t==='err'){ if(weak.indexOf(o.w)<0) weak.push(o.w); } });
    rows.push({en:s.en,cn:s.cn,ops:ops,ok:ops.filter(function(o){return o.t==='ok';}).length,ref:ref.length});
  });
  return {rows:rows,total:total,correct:correct,score:total?Math.round(correct/total*100):0,weak:weak};
}
function diffHTML(ops){
  return ops.map(function(o){
    const mark={ok:'✓',err:'×',miss:'—',extra:'+'}[o.t];
    const label=o.t==='err'?o.w+' <span style="font-size:10px;opacity:.75">（你写了 '+esc(o.got)+'）</span>':esc(o.w);
    return '<span class="dw '+o.t+'"><span class="dw-mark">'+mark+'</span>'+label+'</span>';
  }).join('');
}

/* ---------------- 播放器片段 ---------------- */
function playerHTML(label,sub){
  /* 导入了可控的真实视频 / 音频时，上方已有「我的媒体」播放器，这里降级标注为备用发音 */
  const cm=getCourse(R.courseId), mm=cm&&cm.media;
  const real=!!(mm&&(mm.kind==='file'||mm.kind==='url'));
  const lab=real?'备用发音 · 浏览器语音合成':label;
  const sub2=real?'上方是你的视频 / 音频；这里只在没有原音、或想放慢朗读时使用':sub;
  return '<div class="player'+(real?' player-fallback':'')+'">'+
    '<button class="play-btn" data-act="play" title="播放 / 暂停">'+svg('play',20)+'</button>'+
    '<div class="player-main">'+
      '<div class="player-label">'+(real?'<span class="fallback-tag">备用</span>':'')+esc(lab)+' <small id="pState">点击播放</small></div>'+
      '<div class="player-sub">'+esc(sub2)+'</div>'+
      '<div class="pbar" data-act="seekbar" title="点击跳转"><i id="pbarFill" style="width:0%"></i></div>'+
      '<div class="player-tools">'+
        '<button class="mini-btn voice-btn" data-act="voiceOpen" title="选择发音声音 / 语速">🎙 声音</button>'+
        [0.5,0.75,1,1.25,1.5].map(function(r){ return '<button class="mini-btn '+(Math.abs(R.rate-r)<0.01?'on':'')+'" data-act="rate" data-r="'+r+'">'+r+'×</button>'; }).join('')+
        '<button class="mini-btn '+(R.loop?'on':'')+'" data-act="loop">循环</button>'+
        '<button class="mini-btn" data-act="seek" data-d="-2" title="后退约 5 秒">−5s</button>'+
        '<button class="mini-btn" data-act="seek" data-d="2" title="前进约 5 秒">+5s</button>'+
        '<span class="player-time" id="pTime">00:00 / 00:00</span>'+
      '</div>'+
    '</div></div>';
}

/* ---------------- 发音设置浮层（选声音 / 语速） ---------------- */
let voicePanelEl=null;
function ensureVoicePanel(){
  if(voicePanelEl) return voicePanelEl;
  const el=document.createElement('div');
  el.id='voicePanel'; el.className='voice-panel hidden';
  el.innerHTML=
    '<div class="vp-head">🎙 发音设置 <button class="vp-x" data-vp="close" title="关闭">✕</button></div>'+
    '<div class="vp-row"><label>发音引擎</label><div class="vp-engines">'+
      '<button class="mini-btn vp-eng" data-eng="native">浏览器原生</button>'+
      '<button class="mini-btn vp-eng" data-eng="edge">微软Edge在线(免费)</button>'+
    '</div></div>'+
    '<div class="vp-row vp-native-box"><label>声音（浏览器自带）</label>'+
      '<select id="voiceSel" class="vp-sel"></select>'+
      '<div class="vp-ok hidden" id="nativeHint"></div></div>'+
    '<div class="vp-row vp-edge-box"><label>Edge TTS 地址（已预置，可改）</label>'+
      '<input id="edgeUrl" class="vp-input" placeholder="https://你的.workers.dev" />'+
      '<div class="vp-ok" id="edgeReady">✅ 已连接免费 Worker，13 种声音都是不同的微软在线神经语音。</div>'+
      '<button class="mini-btn vp-reset" data-vp="edgeReset" style="margin-top:6px">恢复默认地址</button>'+
      '<div class="vp-warn hidden" id="edgeWarn">⚠ Worker 地址为空或不可用时，会回退成浏览器原声（听起来都一样）。<br>点「恢复默认」可重新填入已部署好的地址；若仍失败，可切到左边「浏览器原生」。</div>'+
      '<label style="margin-top:8px">声音（微软神经语音）</label>'+
      '<select id="edgeSel" class="vp-sel"></select>'+
      '<div class="vp-tip-mini">推荐 Aria / Jenny / Guy / Davis 等，几乎像真人。</div></div>'+
    '<div class="vp-row"><label>语速</label><div class="vp-speeds">'+
      [0.5,0.75,1,1.25,1.5].map(function(r){ return '<button class="mini-btn vp-rate" data-r="'+r+'">'+r+'×</button>'; }).join('')+
    '</div></div>'+
    '<div class="vp-row vp-actions"><button class="mini-btn primary" data-vp="test">▶ 试听</button>'+
      '<span class="vp-cur" id="vpCur"></span></div>'+
    '<div class="vp-tip">浏览器原生：免费，音质取决于系统语音包（Edge 浏览器自带近真人神经语音）。'+
      '微软Edge在线：同一批神经语音，免费、无需 key、手机/Safari 通用，已预置 Worker 地址，开箱即用。</div>';
  document.body.appendChild(el);
  voicePanelEl=el;
  el.querySelector('[data-vp="close"]').addEventListener('click',function(){ el.classList.add('hidden'); });
  el.querySelector('[data-vp="test"]').addEventListener('click',function(){ testVoice(); });
  el.querySelector('[data-vp="edgeReset"]').addEventListener('click',function(){
    S.edgeUrl=DEFAULT_EDGE_URL; save();
    const eu2=el.querySelector('#edgeUrl'); if(eu2) eu2.value=DEFAULT_EDGE_URL;
    populateVoiceSelect(); toast('已恢复默认 Edge TTS 地址');
  });
  el.querySelectorAll('.vp-eng').forEach(function(b){
    b.addEventListener('click',function(){
      S.ttsEngine=b.dataset.eng; save();
      if(S.ttsEngine==='edge' && !S.edgeUrl) toast('请在下方粘贴 Edge TTS 地址（免费 Worker）');
      populateVoiceSelect();
    });
  });
  el.querySelectorAll('.vp-rate').forEach(function(b){
    b.addEventListener('click',function(){ R.rate=parseFloat(b.dataset.r); paint(); populateVoiceSelect(); });
  });
  el.querySelector('#voiceSel').addEventListener('change',function(e){
    setVoiceURI(e.target.value);
    if(!useEdgeEngine()){ const v=pickVoice(); if(v){ stopVoice(); const u=new SpeechSynthesisUtterance('Hello, I am your English teacher.'); u.lang='en-US'; u.rate=R.rate; u.voice=v; try{ speechSynthesis.speak(u); }catch(err){} } }
  });
  const eu=el.querySelector('#edgeUrl');
  eu.addEventListener('change',function(){ S.edgeUrl=eu.value.trim(); save(); });
  eu.addEventListener('input',function(){ S.edgeUrl=eu.value.trim(); });
  el.querySelector('#edgeSel').addEventListener('change',function(e){
    S.edgeVoice=e.target.value; save();
    if(useEdgeEngine()){ testVoice(); }
  });
  return el;
}
function testVoice(){
  const txt='Hello, I am your English teacher. Listen and repeat after me.';
  if(useEdgeEngine()){ playViaEdge(txt,null,null).catch(function(){ playViaNative(txt,null,null); }); }
  else { playViaNative(txt,null,null); }
}
function populateVoiceSelect(){
  const sel=document.getElementById('voiceSel'); if(!sel) return;
  const eng = (S.ttsEngine==='edge'||(S.ttsEngine==='auto'&&S.edgeUrl))?'edge':'native';
  // 引擎按钮高亮
  document.querySelectorAll('.vp-eng').forEach(function(b){ b.classList.toggle('on', b.dataset.eng===eng); });
  const nBox=document.querySelector('.vp-native-box'), eBox=document.querySelector('.vp-edge-box');
  if(nBox) nBox.style.display = eng==='native'?'block':'none';
  if(eBox) eBox.style.display = eng==='edge'?'block':'none';
  // Edge 引擎但没填地址：禁用声音下拉 + 亮红字警告，避免「选了却都一样」的困惑
  const ew=document.getElementById('edgeWarn'), esEl=document.getElementById('edgeSel'), er=document.getElementById('edgeReady');
  if(eng==='edge' && !S.edgeUrl){ if(ew) ew.classList.remove('hidden'); if(esEl) esEl.disabled=true; if(er) er.classList.add('hidden'); }
  else { if(ew) ew.classList.add('hidden'); if(esEl) esEl.disabled=false; if(er) er.classList.remove('hidden'); }
  // 原生声音
  const list=listEnglishVoices();
  let html='<option value="">自动优选（最自然）</option>';
  list.forEach(function(v){
    const n=esc(v.name)+' · '+esc(v.lang||'')+(/online|neural|natural/i.test(v.name)?' ⭐':'');
    html+='<option value="'+esc(v.voiceURI)+'">'+n+'</option>';
  });
  sel.innerHTML=html; sel.value=S.voiceURI||'';
  // 原生引擎：提示是否已具备「在线神经语音」（路线 A 关键信号）
  const nh=document.getElementById('nativeHint');
  if(nh){
    const hasNeural=list.some(function(v){ return /online|neural|natural/i.test((v.name||'')+' '+(v.voiceURI||'')); });
    nh.classList.remove('hidden');
    if(hasNeural){
      nh.className='vp-ok'; nh.textContent='✅ 已检测到微软在线神经语音（Aria / Jenny 等），已自动优选为最自然的声音——这就是路线 A，无需任何配置。';
    } else {
      nh.className='vp-ok warn'; nh.textContent='未检测到在线神经语音：当前声音偏机械。用 Microsoft Edge 浏览器打开本页，即可自动获得 Aria / Jenny 这类近真人声音。';
    }
  }
  // Edge 声音
  if(esEl){ let eh=''; EDGE_VOICES.forEach(function(v){ eh+='<option value="'+esc(v.id)+'">'+esc(v.name)+'</option>'; }); esEl.innerHTML=eh; esEl.value=S.edgeVoice||'en-US-AriaNeural'; }
  const eu=document.getElementById('edgeUrl'); if(eu) eu.value=S.edgeUrl||'';
  const cur=document.getElementById('vpCur');
  if(cur){ cur.textContent = eng==='edge' ? ('当前：'+ (S.edgeVoice||'en-US-AriaNeural') + (S.edgeUrl?'':'（待填地址）')) : (function(){ const v=pickVoice(); return v?('当前：'+v.name):'无英语语音'; })(); }
  const rateBtns=document.querySelectorAll('.vp-rate');
  rateBtns.forEach(function(b){ b.classList.toggle('on',Math.abs(parseFloat(b.dataset.r)-R.rate)<0.01); });
}
function toggleVoicePanel(){
  const el=ensureVoicePanel();
  const show=el.classList.contains('hidden');
  if(show){ populateVoiceSelect(); el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

/* ---------------- 页面：首页 ---------------- */
function renderHome(){
  const id=activeCourseId(), c=getCourse(id)||COURSES[0], l=getLesson(id);
  const p=prog(id), doneN=p.done.length;
  const nextStep=Math.min(5,doneN);
  const todayDone=S.days.indexOf(dstr())>=0;
  return ''+
  '<section class="hero">'+
    '<div class="hero-top"><span>AI 语言实验室 · AI LANGUAGE LAB</span><span>2026 · 六步学习法</span></div>'+
    '<div class="hero-circle"><span>LEARN</span><span>BY DOING</span><b>01—06</b></div>'+
    '<div class="hero-keys">LISTEN · TRANSCRIBE · IMITATE · RECALL</div>'+
    '<h1>把英语<br><em>听进脑子里</em></h1>'+
    '<p>不是背完一本单词书，而是把一段真实材料，从听懂练到说出来。</p>'+
    '<div class="hero-tags"><span>六步学习法</span><span>44 篇分级课程</span><span>每天更新</span><span class="hl">AI 逐句反馈</span></div>'+
    '<div class="hero-cta"><button class="btn btn-gold btn-lg" data-act="continue">'+svg('play',16)+' 继续今天的一段</button>'+
      '<button class="btn-ghost-light" data-view="method">了解六步学习法</button>'+
      '<span class="hero-note">每天 20 分钟，把一段练透。</span></div>'+
  '</section>'+
  '<div class="stat-row">'+
    '<div class="stat"><div class="k">'+svg('checkCircle',13)+' 已学完课程</div><div class="v">'+completedList().length+'<small>/ 44 篇</small></div><div class="d">一段材料，六步走完才算学完</div></div>'+
    '<div class="stat"><div class="k">'+svg('calendar',13)+' 连续学习</div><div class="v">'+streak()+'<small>天</small></div><div class="d">'+(todayDone?'今天已打卡':'今天还没开始')+'</div></div>'+
    '<div class="stat"><div class="k">'+svg('layers',13)+' 词库词条</div><div class="v">'+S.weak.length+'<small>个</small></div><div class="d">错词与漏词自动留下来</div></div>'+
    '<div class="stat"><div class="k">'+svg('star',13)+' 学习积分</div><div class="v">'+S.points+'<small>分</small></div><div class="d">每完成一步 +10 分</div></div>'+
  '</div>'+
  '<div class="two-col">'+
    '<div class="card today-card">'+
      '<div><div class="eyebrow">TODAY · 今天的一段</div><div class="today-title">'+esc(c.title)+'</div></div>'+
      '<div class="today-meta"><span class="tag">'+esc(c.level)+' · '+esc(c.levelName)+'</span><span class="tag gray">'+esc(c.series)+'</span><span class="tag gold">约 '+l.minutes+' 分钟</span></div>'+
      '<div class="today-desc">'+esc(l.cn)+'。'+esc(l.sentences[0].en)+'</div>'+
      '<div class="today-progress"><i style="width:'+(doneN/6*100)+'%"></i></div>'+
      '<div class="six-mini">'+activeSteps().map(function(s,i){ return '<div class="'+(p.done.indexOf(i)>=0?'done':'')+'"><b>STEP '+s.no+'</b>'+s.name+'</div>'; }).join('')+'</div>'+
      '<div class="today-foot"><span>已完成 '+doneN+' / 6 步 · 进度、草稿、词库自动保存</span>'+
        '<button class="btn btn-primary btn-sm" data-act="continue">'+svg('arrowRight',14)+' '+(doneN>=6?'再练一遍':'继续第 '+(nextStep+1)+' 步：'+activeSteps()[nextStep].name)+'</button></div>'+
    '</div>'+
    '<div class="card method-card">'+
      '<div class="eyebrow">METHOD · 六步学习法</div>'+
      '<div class="sec-title" style="font-size:18px">从盲听开始，一路练到背诵</div>'+
      '<div class="sec-sub">不是六倍负担，是同一段材料的六个台阶。</div>'+
      '<div class="method-list">'+activeSteps().map(function(s,i){
        return '<div class="m"><span class="n">'+s.no+'</span><span>'+s.name+'</span><span>'+s.tag+'</span></div>';
      }).join('')+'</div>'+
      '<button class="btn btn-line btn-sm" data-view="method" style="margin-top:12px">查看方法说明 '+svg('arrowRight',13)+'</button>'+
    '</div>'+
  '</div>'+
  moduleSection()+demoNotice();
}
function demoNotice(){
  return '<div class="notice" style="margin-top:18px">'+svg('compass',14)+' 演示说明：分级数量（7 档 / 44 篇）、两套六步定义与每日系列分别按《六步学习法与课程目录》和《创始早鸟会员权益方案》还原；课文为 6 篇内置示例材料轮换使用，发音由浏览器语音合成提供，录音评分是本地时长/音量估算（非 AI 语音评测）。游戏化模块为演示实现，未接入会员支付或真实课程数据。<b>「我的素材库」可导入自己的文章 / 字幕 / 视频 / 音频</b>，文件只保存在本机浏览器。</div>';
}

/* ---------------- 页面：课程目录 ---------------- */
function renderCourses(){
  let list=allCourses();
  if(R.levelFilter!=='ALL') list=list.filter(function(c){return c.level===R.levelFilter;});
  if(R.search){ const q=R.search.toLowerCase(); list=list.filter(function(c){ return (c.title+' '+c.cn+' '+c.series).toLowerCase().indexOf(q)>=0; }); }
  const chips='<button class="chip '+(R.levelFilter==='ALL'?'active':'')+'" data-act="level" data-l="ALL">全部 <small>44+</small></button>'+
    LEVELS.map(function(l){ return '<button class="chip '+(R.levelFilter===l.code?'active':'')+'" data-act="level" data-l="'+l.code+'">'+l.code+' '+l.name+' <small>'+l.count+'</small></button>'; }).join('');
  return '<div class="sec-head"><div><div class="sec-kicker">COURSES · 分级课程</div>'+
    '<h2 class="sec-title">按你的起点，自由选择难度</h2>'+
    '<div class="sec-sub">44 篇分级课程，7 个难度档；测评只推荐起点，不限制你学哪一档。每篇都走同一套 '+esc(activeTrack().name)+'。</div></div>'+
    '<button class="btn btn-line btn-sm" data-view="method">'+svg('compass',14)+' 六步说明</button></div>'+
    '<div class="filter-bar">'+chips+'<span class="filter-count">'+(R.search?'搜索「'+esc(R.search)+'」· ':'')+'共 '+list.length+' 篇</span></div>'+
    (list.length?'<div class="course-grid">'+list.map(courseCard).join('')+'</div>':
      '<div class="card empty"><h3>没有找到匹配的课程</h3><p>换个关键词，或切换到「全部」难度。</p><button class="btn btn-primary btn-sm" data-act="clearSearch">清除筛选</button></div>')+
    '<div class="notice" style="margin-top:16px">'+svg('compass',14)+' 目录分级与篇数严格按手册 P10 还原（PreA1 5 / A1 13 / A2 10 / B1 7 / B2 2 / C1 5 / C2 2）。课程标题为演示条目，课文取自 6 篇内置示例材料，可在数据层直接替换为真实内容。</div>';
}
function courseCard(c,i){
  const p=prog(c.id), pct=p.done.length/6*100;
  const l=getLesson(c.id);
  return '<div class="card course-card" data-act="open" data-id="'+esc(c.id)+'">'+
    (completedList().indexOf(c.id)>=0?'<span class="cc-done">'+svg('check',12)+'</span>':'')+
    '<div class="cc-top"><span class="level-badge '+esc(c.tone||'')+'">'+esc(c.level)+' · '+esc(c.levelName||'')+'</span><span class="cc-idx">NO. '+(c.idx||'DIY')+'</span></div>'+
    '<div><div class="cc-title">'+esc(c.title)+'</div><div class="cc-cn">'+esc(c.cn)+'</div></div>'+
    '<div class="cc-tags"><span class="tag gray">'+esc(c.series)+'</span><span class="tag">'+l.sentences.length+' 句</span>'+(c.custom?'<span class="tag gold">我的素材</span>':'')+
      (c.media&&c.media.kind!=='none'?'<span class="tag navy">'+esc(libSourceTag(c.media))+'</span>':'')+'</div>'+
    (pct>0?'<div class="today-progress" style="height:5px"><i style="width:'+pct+'%"></i></div>':'')+
    '<div class="cc-foot"><span>'+(pct>0?'已练 '+p.done.length+' / 6 步':'尚未开始')+' · 约 '+l.minutes+' 分钟</span><span class="go">进入六步 '+svg('arrowRight',13)+'</span></div>'+
  '</div>';
}

/* ---------------- 页面：学习页 ---------------- */
function renderLesson(){
  const id=R.courseId,c=getCourse(id),l=getLesson(id);
  if(!c||!l){ return '<div class="card empty"><h3>课程不存在</h3><button class="btn btn-primary" data-view="courses">返回课程目录</button></div>'; }
  if(!l.sentences||!l.sentences.length){
    const m=c.media;
    if(m&&m.kind&&m.kind!=='none'){
      /* 已导入视频 / 音频但还没台词：先给播放器，再引导补原文 */
      return '<div class="card empty media-empty"><h3>先看看你导入的'+(m.type==='audio'?'音频':'视频')+'</h3>'+
        '<p>这门课还没有英文原文，所以盲听 / 听写 / 核对暂时用不了。你可以先观看 / 收听，然后<b>补充英文原文</b>（一句一行）就能走完整的六步。'+
          (m.kind==='external'?'<br>这是外部链接，需在原平台观看，下方有打开按钮。':'')+'</p>'+
        (typeof mediaPlayerHTML==='function'?mediaPlayerHTML():'')+
        '<div class="media-empty-acts">'+
          '<button class="btn btn-primary" data-act="libAddText" data-id="'+esc(id)+'">补充英文原文 '+svg('arrowRight',13)+'</button>'+
          '<button class="btn btn-line btn-sm" data-view="courses" style="margin-left:8px">返回课程目录</button></div></div>';
    }
    return '<div class="card empty"><h3>这门课还没有英文原文</h3>'+
      '<p>盲听 / 听写 / 核对需要先有台词。视频号或外链无法自动抓取字幕，请在「我的素材库」里「补充英文原文」——一句一行粘贴台词即可。</p>'+
      '<button class="btn btn-primary" data-act="libAddText" data-id="'+esc(id)+'">补充英文原文 '+svg('arrowRight',13)+'</button>'+
      '<button class="btn btn-line btn-sm" data-view="courses" style="margin-left:8px">返回课程目录</button></div>';
  }
  const p=prog(id),s=activeSteps()[R.step];
  const pct=p.done.length/6*100;
  const rail='<div class="step-rail"><div class="rail-label">SIX STEPS · 01—06 <em>'+esc(activeTrack().name)+'</em></div>'+
    activeSteps().map(function(st,i){
      const done=p.done.indexOf(i)>=0;
      return '<button class="rail-item '+(R.step===i?'active':'')+' '+(done?'done':'')+'" data-act="goStep" data-n="'+i+'" title="'+st.name+'">'+
        '<span class="ri-num">'+(done?svg('check',13):st.no)+'</span><span class="ri-name">'+st.name+'</span>'+
        '<span class="ri-state">'+(done?'✓':R.step===i?'●':'')+'</span></button>';
    }).join('')+
    (S.sixMode?'<div class="rail-tip">听懂了才写得对，写对了才查得准。随时暂停，进度自动保存。</div>':'')+
  '</div>';
  return '<div class="back-link" data-view="courses" style="cursor:pointer">'+svg('arrowLeft',13)+' 返回课程目录</div>'+
    '<div class="lesson-head"><div>'+
      '<h1 class="lesson-title">'+esc(c.title)+'</h1>'+
      '<div class="lesson-meta"><span class="tag">'+esc(c.level)+' · '+esc(c.levelName||'')+'</span>'+
        '<span class="tag gray">'+esc(c.series)+'</span><span class="tag gold">'+esc(l.accent)+'</span>'+
        '<span class="tag navy">示例课文 · '+esc(l.title)+'</span></div>'+
    '</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-line btn-sm" data-act="openTrack">'+svg('settings',13)+' '+esc(activeTrack().name)+' · 切换</button>'+
      '<button class="btn btn-line btn-sm" data-view="courses">换一篇</button></div></div>'+
    '<div class="lesson-progress"><span class="lp-txt">学习进度</span><div class="lp-bar"><i style="width:'+pct+'%"></i></div>'+
      '<span class="lp-txt"><b>'+p.done.length+' / 6</b> 步完成 · '+l.sentences.length+' 句 · 约 '+l.minutes+' 分钟</span></div>'+
    '<div class="lesson-grid">'+rail+stepCardHTML()+'</div>';
}
function stepCardHTML(){
  const s=activeSteps()[R.step];
  /* 两套轨道：同一套「六步」外壳，装载不同的步骤内容 */
  const bodies=isQuest()
    ? [bodyBlind,bodyShadow,bodyBreakdown,bodyQuestGate,bodyQuestReview,bodyRecite]
    : [bodyBlind,bodyDict,bodyCheck,bodyAnalyze,bodyShadow,bodyRecite];
  const body=(bodies[R.step]||bodyBlind)();
  const prev='<button class="btn btn-line btn-sm" data-act="goStep" data-n="'+Math.max(0,R.step-1)+'" '+(R.step===0?'disabled':'')+'>'+svg('arrowLeft',13)+' 上一步</button>';
  const hint='<span class="hint">'+(S.sixMode?'进度、草稿、词库自动保存':'自由练习模式 · 引导已隐藏')+'</span>';
  const next=R.step<5?'<button class="btn btn-primary btn-sm" data-act="stepNext">完成本步，进入 '+activeSteps()[R.step+1].name+' '+svg('arrowRight',13)+'</button>':
    '<button class="btn btn-primary btn-sm" data-act="finishLesson">'+svg('check',14)+' 完成文章，收进今天的积累</button>';
  return '<div class="card step-card">'+
    '<div class="step-head"><div><div class="step-no">STEP '+s.no+' / 06 <span class="step-en">'+s.en+'</span></div>'+
      '<div class="step-title">'+s.title+'</div>'+(S.sixMode?'<div class="step-lead">'+s.lead+'</div>':'')+'</div>'+
      '<span class="tag gold">'+s.tag+'</span></div>'+
    '<div class="step-body">'+(typeof mediaPlayerHTML==='function'?mediaPlayerHTML():'')+body+'</div>'+
    '<div class="step-foot">'+prev+hint+next+'</div></div>';
}

/* 步骤 01 盲听 */
function bodyBlind(){
  const id=R.courseId,l=getLesson(id),listens=S.listen[id]||0,q=l.quiz,ans=S.quiz[id];
  return '<div class="blind-hint">'+svg('ear',16)+' 不看原文 · 先听两遍，抓住场景和人物关系；听不懂也可以先猜，带着问题进入听写。</div>'+
    '<div class="listen-count">'+
      '<span class="listen-dot '+(listens>0?'done':'')+'">'+(listens>0?svg('check',13)+' 第 1 遍完成':'第 1 遍')+'</span>'+
      '<span class="listen-dot '+(listens>1?'done':'')+'">'+(listens>1?svg('check',13)+' 第 2 遍完成':'第 2 遍')+'</span>'+
      '<span class="listen-dot">共 '+l.sentences.length+' 句 · 约 '+l.minutes+' 分钟</span></div>'+
    playerHTML('整篇播放 · 先看大意','不看原文，先让耳朵工作；可以调慢到 0.75× 再听一遍')+
    '<div class="listen-quiz"><div class="quiz-q">理解问题 · '+esc(q.q)+'</div><div class="quiz-opts">'+
      q.options.map(function(o,i){
        let cls='';
        if(ans!==undefined){ if(i===q.answer) cls='correct'; else if(i===ans) cls='wrong'; }
        return '<button class="quiz-opt '+cls+'" data-act="quiz" data-i="'+i+'"><span class="qo-k">'+'ABC'[i]+'</span>'+esc(o)+'</button>';
      }).join('')+'</div>'+
      '<div class="quiz-fb">'+(ans!==undefined?svg('check',13)+' '+esc(q.explain):'先猜一个答案，答案不影响进入下一步。')+'</div></div>';
}

/* 步骤 02 听写 */
function bodyDict(){
  const id=R.courseId,l=getLesson(id),d=draftOf(id);
  const si=clamp(R.dictSeg,0,l.sentences.length-1);
  const s=l.sentences[si],ref=wordsOf(s.en),slots=d[si]||[];
  const segs=l.sentences.map(function(_,i){ return '<button class="seg-pill '+(i===si?'active':'')+'" data-act="dictSeg" data-i="'+i+'">第 '+(i+1)+' 句</button>'; }).join('');
  const inputs=slots.map(function(v,i){
    const filled=v.trim()!=='';
    return '<div class="word-slot"><span class="ws-n">'+String(i+1).padStart(2,'0')+'</span>'+
      '<input class="word-input '+(filled?'filled':'')+'" data-wi="'+i+'" value="'+esc(v)+'" autocomplete="off" spellcheck="false" placeholder="…" aria-label="第 '+(i+1)+' 个词"></div>';
  }).join('');
  return '<div class="dict-seg"><span class="s-label">第 '+(si+1)+' / '+l.sentences.length+' 句 · 听不清就跳格，不被一个词卡住</span>'+segs+'</div>'+
    playerHTML('听清这一句，慢慢写下来','当前定位：从第 '+(clamp(R.wordStart,0,Math.max(0,ref.length-1))+1)+' 词开始')+
    '<div class="word-grid">'+inputs+'<button class="btn btn-line btn-sm" data-act="addSlot" title="多写一格，用于记录额外词" style="height:38px;align-self:flex-end">'+svg('plus',13)+' 加一格</button></div>'+
    (S.sixMode?'<div class="kbd-card">'+
      '<div class="kbd"><kbd>空格 / Tab</kbd> 下一格</div>'+
      '<div class="kbd"><kbd>Enter</kbd> 播放 / 暂停</div>'+
      '<div class="kbd"><kbd>← / →</kbd> 后退 / 前进约 5 秒</div></div>':'')+
    '<div class="skip-note" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
      '<span>允许跳格：<button class="mini-btn '+(R.allowSkip?'on':'')+'" data-act="skipToggle">'+(R.allowSkip?'开':'关')+'</button></span>'+
      '<span>错写、漏写、额外词都会保留下来，不是扣分，是下一次练习的定位。</span></div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:10px">演示版用浏览器语音合成发音，「后退 / 前进 5 秒」以词为单位近似定位；接入真实音频后可直接按秒跳转。</div>';
}

/* 步骤 03 核对 */
function bodyCheck(){
  const id=R.courseId,l=getLesson(id),d=diffAll(id);
  const anyTyped=draftOf(id).some(function(a){return a.some(function(w){return w.trim()!=='';});});
  const robotSvg='<svg class="robot" viewBox="0 0 64 64" fill="none" stroke="#1da276" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="22" width="40" height="30" rx="9" fill="#e6f5ed"/><path d="M32 12v10"/><circle cx="32" cy="9" r="3" fill="#d19a37" stroke="none"/><circle cx="25" cy="36" r="2.4" fill="#1da276" stroke="none"/><circle cx="39" cy="36" r="2.4" fill="#1da276" stroke="none"/><path d="M25 44q7 5 14 0"/><path d="M8 32h4M52 32h4"/></svg>';
  let html='<div class="score-hero">'+robotSvg+'<div class="score-num">'+d.score+'<small> 分</small></div>'+
    '<div class="score-info"><div class="si-1">写完啦！一起看看吧。</div>'+
      '<div class="si-2">'+d.correct+' / '+d.total+' 词正确 · 共 '+l.sentences.length+' 句 · 按原文单词逐项对照</div>'+
      '<div class="score-legend"><span class="lg ok">✓ 正确</span><span class="lg err">× 错写</span><span class="lg miss">— 漏写</span><span class="lg extra">+ 额外词</span></div></div></div>';
  if(!anyTyped) html+='<div class="blind-hint" style="background:var(--gold-l);border-color:#f0dfb8;color:var(--gold-d)">还没有听写草稿。可以先回第 2 步写几句，再来核对；下面是完整原文对照。</div>';
  html+=d.rows.map(function(r,i){
    return '<div class="diff-line"><div class="diff-n">第 '+(i+1)+' 句 · '+r.ok+' / '+r.ref+' 词正确</div>'+
      '<div class="diff-words">'+diffHTML(r.ops)+'</div>'+
      '<div class="diff-ref">'+esc(r.cn)+'</div></div>';
  }).join('');
  html+='<div class="weak-box"><h4>薄弱词，留下来</h4><p>把错词和漏词加入词库；不急着看解析，先自己找原因，再进入查解。</p>'+
    '<div class="weak-list">'+(d.weak.length?d.weak.map(function(w){ return '<span class="weak-chip">'+esc(w)+'<button data-act="addWeak" data-w="'+esc(w)+'" title="加入词库">'+svg('plus',12)+'</button></span>'; }).join(''):'<span style="font-size:11px;color:var(--muted)">暂无薄弱词，全部听对啦。</span>')+'</div>'+
    (d.weak.length?'<button class="btn btn-gold btn-sm" data-act="addAllWeak" style="margin-top:11px">'+svg('plus',13)+' 全部加入词库</button>':'')+'</div>';
  return html;
}

/* 步骤 04 查解 */
function bodyAnalyze(){
  const l=getLesson(R.courseId);
  const tabs=['全文对照','逐句精讲','篇章与表达'].map(function(t){ return '<button class="seg-tab '+(R.analysisTab===t?'active':'')+'" data-act="anTab" data-t="'+t+'">'+t+'</button>'; }).join('');
  let inner='';
  if(R.analysisTab==='全文对照'){
    inner='<div class="trans-block"><div class="trans-col"><div class="tc-h">ENGLISH · 点任意单词查看释义</div>'+
      l.sentences.map(function(s){return '<div class="trans-line en">'+clickable(s.en)+'</div>';}).join('')+'</div>'+
      '<div class="trans-col"><div class="tc-h">中文对照 · 先看整篇意思</div>'+
      l.sentences.map(function(s){return '<div class="trans-line cn">'+esc(s.cn)+'</div>';}).join('')+'</div></div>';
  } else if(R.analysisTab==='逐句精讲'){
    inner=l.sentences.map(function(s,i){
      return '<div class="sentence-card"><div class="sc-en">'+clickable(s.en)+'</div><div class="sc-cn">'+esc(s.cn)+'</div>'+
        '<div class="chunk-row">'+(s.chunks||[]).map(function(c){return '<span class="chunk">'+esc(c.t)+'<small>'+esc(c.c)+'</small></span>';}).join('')+'</div>'+
        (s.note?'<div class="sc-note">'+esc(s.note)+'</div>':'')+'</div>';
    }).join('');
  } else {
    inner='<div class="card" style="padding:18px 20px;margin-bottom:13px"><div class="eyebrow">篇章与表达</div>'+
      '<div style="font-size:13px;line-height:1.9;margin-top:8px">'+esc(l.summary)+'</div></div>'+
      '<div class="expression-list">'+(l.expressions||[]).map(function(e){return '<div class="expr"><b>'+esc(e.t)+'</b><span>'+esc(e.c)+'</span></div>';}).join('')+'</div>';
  }
  return '<div class="seg-tabs">'+tabs+'</div>'+inner+
    '<div style="font-size:11px;color:var(--muted);margin-top:12px">点词即查：释义、词性、音标、发音，还能把词收进自己的词库。</div>';
}

/* 步骤 05 跟读 */
function bodyShadow(){
  const l=getLesson(R.courseId);
  const mode='<div class="seg-tabs" style="margin-bottom:13px">'+
    '<button class="seg-tab '+(R.shadowMode==='sentence'?'active':'')+'" data-act="shMode" data-m="sentence">逐句模仿</button>'+
    '<button class="seg-tab '+(R.shadowMode==='pass'?'active':'')+'" data-act="shMode" data-m="pass">整篇连读</button></div>';
  let inner='';
  if(R.shadowMode==='sentence'){
    inner=playerHTML('先听原句，再录一遍','第 '+(R.shadowSeg+1)+' / '+l.sentences.length+' 句 · 对照原音调整节奏')+
      l.sentences.map(function(s,i){
        const k='sh_'+i, rec=R.recordings[k], sc=R.scores[k];
        return '<div class="shadow-row '+(i===R.shadowSeg?'active':'')+'">'+
          '<span class="sr-n">'+(i+1)+'</span><div class="sr-text"><div class="sr-en">'+esc(s.en)+'</div><div class="sr-cn">'+esc(s.cn)+'</div></div>'+
          '<button class="mini-btn" data-act="shPlay" data-i="'+i+'">'+svg('volume',13)+' 原音</button>'+
          '<button class="rec-btn '+(Rec.active===k?'recording':'')+'" data-act="record" data-k="'+k+'" title="录音 / 结束">'+svg('mic',15)+'</button>'+
          (rec?'<audio controls src="'+rec.url+'" style="height:34px;max-width:190px"></audio>':'')+
          '<button class="btn btn-line btn-sm" data-act="shFocus" data-i="'+i+'">选这句</button>'+
          (sc?scoreHTML(sc):'')+'</div>';
      }).join('');
  } else {
    const k='sh_pass', rec=R.recordings[k], sc=R.scores[k];
    inner=playerHTML('整篇连读','全部句子连起来读，注意停顿和重音')+
      '<div class="card" style="padding:18px 20px"><div class="sc-en" style="line-height:1.9">'+clickable(sentenceText(l))+'</div>'+
      '<div style="display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap">'+
        '<button class="rec-btn '+(Rec.active===k?'recording':'')+'" data-act="record" data-k="'+k+'">'+svg('mic',15)+'</button>'+
        '<span style="font-size:11.5px;color:var(--muted)">'+(Rec.active===k?'正在录音…再点一次结束':'点麦克风开始录整篇')+'</span>'+
        (rec?'<audio controls src="'+rec.url+'" style="height:34px;max-width:230px"></audio>':'')+'</div>'+
        (sc?scoreHTML(sc):'')+'</div>';
  }
  return mode+inner+
    '<div class="rec-note">录音只保留在当前页面，切换课程或刷新后自动清空；完整度 / 流利度由录音时长与音量本地估算，准确度需要接入 ASR 语音识别后才能评分，此处不编造分数。</div>';
}

/* 步骤 06 背诵 */
function bodyRecite(){
  const l=getLesson(R.courseId);
  const passes=[{t:'1 · 英文提示',d:'先抓住关键词'},{t:'2 · 中文提示',d:'先想意思，再转英文'},{t:'3 · 白屏脱稿',d:'只剩计时和录音'}];
  const passHTML='<div class="pass-row">'+passes.map(function(p,i){
    return '<button class="pass '+(R.recitePass===i?'active':'')+' '+(R.reciteDone.indexOf(i)>=0?'done':'')+'" data-act="rePass" data-p="'+i+'">'+
      '<b>'+p.t+'</b><span>'+p.d+(R.reciteDone.indexOf(i)>=0?' · 已完成':'')+'</span></button>';
  }).join('')+'</div>';
  let stage='';
  if(R.recitePass===0){
    stage='<div class="recite-stage"><div class="eyebrow">PASS 1 · 英文提示</div><div class="rs-en">'+
      l.sentences.map(function(s){ return wordsOf(s.en).filter(function(w){return w.length>3&&!['that','with','from','have','will','would','their','about','because','often','still','every','under','before','after','while','there','these','those','which'].includes(w.toLowerCase());}).slice(0,4).map(function(w){return '<span class="hint-word">'+esc(w.charAt(0))+'___</span>';}).join(''); }).join('<br>')+
      '</div><div class="rs-cn">看着关键词，把整段说出来</div></div>';
  } else if(R.recitePass===1){
    stage='<div class="recite-stage"><div class="eyebrow">PASS 2 · 中文提示</div>'+
      l.sentences.map(function(s){return '<div class="rs-cn">'+esc(s.cn)+'</div>';}).join('')+
      '<div style="font-size:11px;color:var(--faint)">先想意思，再转英文</div></div>';
  } else {
    stage='<div class="recite-stage blank"><div class="eyebrow">PASS 3 · 白屏脱稿</div>'+
      '<div class="rs-timer" id="rsTimer">'+fmtTime(R.timerSec)+'</div><div class="rs-blank">只剩计时和录音 · 说出来，才算学完</div></div>';
  }
  const k='recite_'+R.recitePass, rec=R.reciteRecords[k];
  const controls='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
    '<button class="btn '+(R.timer?'btn-line':'btn-primary')+' btn-sm" data-act="reTimer">'+(R.timer?'停止计时':'开始计时')+'</button>'+
    '<button class="rec-btn '+(Rec.active===k?'recording':'')+'" data-act="record" data-k="'+k+'" title="录这一遍">'+svg('mic',15)+'</button>'+
    '<span style="font-size:11px;color:var(--muted)">'+(Rec.active===k?'录音中…再点一次结束':'每一遍都可以单独录音')+'</span>'+
    (rec?'<audio controls src="'+rec.url+'" style="height:34px;max-width:210px"></audio>':'')+
    '<button class="btn btn-soft btn-sm" data-act="reDone" style="margin-left:auto">完成这一遍 '+svg('arrowRight',13)+'</button></div>';
  if(completedList().indexOf(R.courseId)>=0 && R.reciteDone.length>=3){
    return '<div class="celebrate"><div class="big">'+svg('checkCircle',46)+'</div><h3>说出来，才算学完</h3>'+
      '<p>《'+esc(getCourse(R.courseId).title)+'》已成为你今天的积累，而不是「看过的材料」。</p>'+
      '<div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary btn-sm" data-view="courses">再学一篇</button>'+
      '<button class="btn btn-line btn-sm" data-view="home">回到今天</button></div></div>';
  }
  return passHTML+stage+controls+'<div class="rec-note">三遍，一步步放手。录音只保留在当前页面；完成后，这篇文章成为你今天的积累。</div>';
}

/* ---------------- 页面：词库 / 跟读 / 背诵 / 每日 / 方法 / DIY ---------------- */
function renderVocab(){
  return '<div class="sec-head"><div><div class="sec-kicker">VOCABULARY · 我的词库</div>'+
    '<h2 class="sec-title">薄弱词，留下来</h2><div class="sec-sub">错词和漏词从「核对」自动汇总；点词即查时也可以手动收词。</div></div>'+
    '<button class="btn btn-line btn-sm" data-view="courses">'+svg('plus',14)+' 去练一篇</button></div>'+
    (S.weak.length?'<div class="vocab-grid">'+S.weak.map(function(w){
      return '<div class="card vocab-card"><button class="del" data-act="delWeak" data-w="'+esc(w.w)+'" title="移出词库">'+svg('close',13)+'</button>'+
        '<span class="pos">'+esc(w.pos)+' '+esc(w.p||'')+'</span><b>'+esc(w.w)+'</b>'+
        '<div class="def">'+esc(w.def)+'</div><div class="src">来自 · '+esc(w.src||'手动添加')+'</div>'+
        '<button class="mini-btn" data-act="playWord" data-w="'+esc(w.w)+'" style="margin-top:8px;align-self:flex-start">'+svg('volume',12)+' 发音</button></div>';
    }).join('')+'</div>':'<div class="card empty">'+svg('layers',30)+'<h3>词库还是空的</h3><p>走一遍「听写 → 核对」，错词和漏词会自动留在这里。</p><button class="btn btn-primary btn-sm" data-view="courses">去选一篇课程</button></div>');
}
function trainingPage(kind){
  const step=kind==='shadow'?(isQuest()?1:4):5;
  const list=allCourses().filter(function(c){ return prog(c.id).done.length>0 || completedList().indexOf(c.id)>=0; });
  const title=kind==='shadow'?'跟读训练':'背诵训练';
  const sub=kind==='shadow'?'先逐句模仿，再整篇连读；录音回听，听自己的节奏。':'从英文提示到中文提示，最后白屏脱稿说出来。';
  return '<div class="sec-head"><div><div class="sec-kicker">'+(kind==='shadow'?'SHADOWING':'RECALL')+' · 训练</div>'+
    '<h2 class="sec-title">'+title+'</h2><div class="sec-sub">'+sub+'</div></div></div>'+
    (list.length?'<div class="course-grid">'+list.map(function(c){
      const l=getLesson(c.id),p=prog(c.id);
      return '<div class="card course-card" data-act="openStep" data-id="'+esc(c.id)+'" data-n="'+step+'">'+
        '<div class="cc-top"><span class="level-badge">'+esc(c.level)+'</span><span class="cc-idx">STEP 0'+(step+1)+'</span></div>'+
        '<div><div class="cc-title">'+esc(c.title)+'</div><div class="cc-cn">'+esc(c.cn)+'</div></div>'+
        '<div class="cc-tags"><span class="tag">'+l.sentences.length+' 句</span><span class="tag gray">已完成 '+p.done.length+' / 6 步</span></div>'+
        '<div class="cc-foot"><span>'+(kind==='shadow'?'进入逐句跟读':'进入三遍背诵')+'</span><span class="go">开始 '+svg('arrowRight',13)+'</span></div></div>';
    }).join('')+'</div>':'<div class="card empty"><h3>还没有在学的课程</h3><p>先从课程目录选一篇，走一遍六步，这里就会出现训练入口。</p><button class="btn btn-primary btn-sm" data-view="courses">去选课程</button></div>')+
    '<div class="notice" style="margin-top:16px">录音只保留在当前页面，不随账号保存；评分需要接入语音识别服务才能给出「准确度」。</div>';
}
function renderDaily(){
  return '<div class="sec-head"><div><div class="sec-kicker">FRESH MATERIAL · 每天更新</div>'+
    '<h2 class="sec-title">不是只有一套课，是持续更新的材料库</h2>'+
    '<div class="sec-sub">新闻、访谈、演讲、剧集、自然拼读和新概念笔记，全部进入同一套六步学习。</div></div></div>'+
    '<div class="stat-row" style="grid-template-columns:repeat(4,1fr)">'+LIBRARY_STATS.map(function(s){
      return '<div class="stat"><div class="k">'+svg('calendar',13)+' 材料库</div><div class="v">'+s.v+'<small>'+s.u+'</small></div><div class="d">'+s.d+'</div></div>';
    }).join('')+'</div>'+
    '<div class="daily-grid">'+DAILY_SERIES.map(function(s){
      return '<div class="card daily-card"><div class="daily-ico">'+svg(s.icon,19)+'</div><div><h4>'+esc(s.name)+'</h4><p>'+esc(s.desc)+'</p>'+
        '<span class="tag gold">'+esc(s.tag)+'</span> <span class="tag gray">同一套六步</span></div></div>';
    }).join('')+'</div>'+
    '<div class="notice" style="margin-top:16px">手册中的每日材料需要外部内容源与版权授权，演示版仅还原栏目结构与数量，不接入真实新闻/剧集正文。可在 DIY 课程里导入自己的文章，生成音频与六步学习材料。</div>'+
    '<div style="margin-top:14px"><button class="btn btn-primary btn-sm" data-view="diy">'+svg('upload',14)+' 导入我的视频 / 文章</button></div>';
}
function renderMethod(){
  const rows=LEVELS.map(function(l){
    return '<div style="display:flex;align-items:center;gap:12px;padding:11px 15px;border-bottom:1px dashed var(--line2);font-size:12px;flex-wrap:wrap">'+
      '<span class="level-badge '+l.tone+'" style="min-width:82px;text-align:center">'+l.code+' '+l.name+'</span>'+
      '<b style="min-width:46px">'+l.count+' 篇</b><span style="color:var(--muted);flex:1;min-width:150px">'+esc(l.stage)+'</span>'+
      '<span class="tag gray">词汇 '+esc(l.vocab)+'</span></div>';
  }).join('');
  return '<div class="method-hero"><div class="eyebrow">THE SIX STEPS · '+esc(activeTrack().name)+' · 六个步骤，缺一步都不算学完</div>'+
    '<h2>从盲听开始，一路练到背诵。</h2>'+
    '<p>不是六倍负担，是同一段材料，从「听懂」走到「说出来」的六个台阶。你不需要一次学完一整篇，每一小段都可以走一遍六步，随时暂停，进度自动保存。</p></div>'+
    '<div class="six-grid">'+activeSteps().map(function(s){
      return '<div class="card six-card"><div class="sc-top"><span class="step-no">STEP '+s.no+'</span><span class="six-ico">'+svg(s.icon,17)+'</span></div>'+
        '<h3>'+s.name+'</h3><p>'+s.tag+' · '+s.lead+'</p></div>';
    }).join('')+'</div>'+
    '<div class="callout"><b>每一步都为下一步服务：</b>听懂了才写得对，写对了才查得准，查懂了才读得像，读熟了才背得出。</div>'+
    trackCompareHTML()+
    '<div class="sec-head" style="margin-top:26px"><div><div class="sec-kicker">LEVELS · 分级课程</div><h2 class="sec-title" style="font-size:19px">44 篇 · 7 个难度档</h2></div>'+
      '<button class="btn btn-primary btn-sm" data-view="courses">去选课程 '+svg('arrowRight',13)+'</button></div>'+
    '<div class="card" style="padding:4px 4px">'+rows+'</div>'+
    '<div class="notice" style="margin-top:16px">每天 20 分钟，把一段练透：选一篇 → 盲听+听写 → 核对+查解 → 跟读+背诵。进度、草稿、词库自动保存；录音只保留在当前页面。</div>';
}
/* 旧版纯文本 DIY 表单保留为兼容实现；当前入口改由 library.js 的「我的素材库」提供 */
function renderDiyLegacy(){
  return '<div class="sec-head"><div><div class="sec-kicker">DIY COURSE · 学自己的内容</div>'+
    '<h2 class="sec-title">导入一篇文章，生成六步学习材料</h2>'+
    '<div class="sec-sub">粘贴英文原文（可另附中文对照），自动切句、生成浏览器语音、进入同一套盲听 → 背诵流程。</div></div></div>'+
    '<div class="card" style="padding:22px 24px">'+
      '<div class="diy-row" style="margin:0 0 14px"><div class="field"><label>课程标题</label><input id="diyTitle" placeholder="例如：My Weekend Note" value=""></div>'+
      '<div class="field"><label>难度档</label><select id="diyLevel">'+LEVELS.map(function(l){return '<option value="'+l.code+'">'+l.code+' · '+l.name+'</option>';}).join('')+'</select></div></div>'+
      '<div class="field" style="margin-bottom:13px"><label>英文原文（按句号 / 换行切句，最多 12 句）</label>'+
        '<textarea class="diy-area" id="diyEn" placeholder="Paste your English passage here. One sentence per line, or separate sentences with a period."></textarea></div>'+
      '<div class="field"><label>中文对照（可选，按行对应；留空则该句不提供中文提示）</label>'+
        '<textarea class="diy-area" id="diyCn" style="min-height:90px;font-family:var(--sans)" placeholder="第一行对应第一句，第二行对应第二句……"></textarea></div>'+
      '<div class="diy-row"><button class="btn btn-primary" data-act="diyGen">'+svg('sparkle',15)+' 生成六步学习材料</button>'+
        '<span style="font-size:11px;color:var(--muted)">生成后会自动打开课程，走同一套六步。</span></div></div>'+
    (S.diy.length?'<div class="sec-head" style="margin-top:26px"><div><div class="sec-kicker">MY DIY COURSES</div><h2 class="sec-title" style="font-size:19px">我导入的课程 · '+S.diy.length+' 篇</h2></div></div>'+
      '<div class="course-grid">'+S.diy.map(courseCard).join('')+'</div>':'')+
    '<div class="notice" style="margin-top:16px">演示版不调用翻译或 AI 服务：中文对照完全取自你粘贴的内容，未提供时会明确标注，不会自动编造译文。发音使用浏览器语音合成。</div>';
}
function splitSents(t){
  return String(t||'').replace(/\r/g,'').replace(/([.!?。！？])\s+/g,'$1\n').split(/\n+/).map(function(s){return s.trim();}).filter(Boolean).slice(0,12);
}
function makeDiyLesson(title,en,cn){
  const ens=splitSents(en), cns=String(cn||'').replace(/\r/g,'').split(/\n+/).map(function(s){return s.trim();}).filter(Boolean);
  const sentences=ens.map(function(s,i){
    const ws=wordsOf(s).filter(function(w){return w.length>4;}).slice(0,2);
    return {en:s,cn:cns[i]||'（未提供中文对照，可在 DIY 页面补充）',
      chunks:ws.length?ws.map(function(w){return {t:w,c:'来自你导入的文章，点词可查释义'};}):[{t:'自定义材料',c:'来自你导入的文章'}],
      note:'这是你导入的材料，逐句精讲与篇章解析可后续补充。'};
  });
  return {title:title,cn:'我导入的文章',accent:'自定义 · DIY',minutes:Math.max(5,ens.length*2),
    quiz:{q:'听完后自评：你能说出这段的大意吗？',options:['能说出大意和人物 / 事件','只抓住了几个词','基本没听懂'],answer:0,
      explain:'这是自评题，不计入评分。盲听的目标是抓大意，不必听懂每个词。'},
    sentences:sentences,expressions:[],summary:'你导入的一篇文章，共 '+ens.length+' 句，已进入同一套六步学习流程。'};
}

/* ---------------- 渲染入口 ---------------- */
const CRUMB={home:'学习课程',courses:'官方课程',lesson:'六步学习',vocab:'词库',shadow:'跟读训练',recite:'背诵训练',
  daily:'每日更新',method:'六步学习法',diy:'我的素材库',
  classroom:'教室课堂',gate:'单词闯关',tank:'坦克大战',review:'智能复习'};
function paint(){
  const key=R.view+'|'+(R.courseId||'')+'|'+R.step;
  const changed=key!==R.voiceKey;
  if(changed && !R.keepAudio){ stopVoice(); R.voiceKey=key; }
  let html='';
  switch(R.view){
    case 'home': html=renderHome(); break;
    case 'courses': html=renderCourses(); break;
    case 'lesson': html=renderLesson(); break;
    case 'vocab': html=renderVocab(); break;
    case 'shadow': html=trainingPage('shadow'); break;
    case 'recite': html=trainingPage('recite'); break;
    case 'daily': html=renderDaily(); break;
    case 'method': html=renderMethod(); break;
    case 'diy': html=renderMyLib(); break;
    case 'classroom': html=renderClassroom(); break;
    case 'gate': html=renderGate(); break;
    case 'tank': html=renderTank(); break;
    case 'review': html=renderReview(); break;
    default: html=renderHome();
  }
  $('#view').innerHTML=html;
  $('#crumb').innerHTML=CRUMB[R.view]||'学习课程';
  document.querySelectorAll('.nav-item').forEach(function(b){ b.classList.toggle('active',b.dataset.view===R.view||(R.view==='lesson'&&b.dataset.view==='courses')); });
  $('#vocabBadge').textContent=S.weak.length;
  $('#pointsVal').textContent=S.points;
  $('#modePill').classList.toggle('off',!S.sixMode);
  $('#modePill').innerHTML='<span class="mode-dot"></span>六步模式 <b>'+(S.sixMode?'开':'关')+'</b>';
  const tp=$('#trackPill');
  if(tp) tp.innerHTML=svg('settings',13)+' <b>'+esc(activeTrack().name)+'</b>';
  const rb=$('#reviewBadge');
  if(rb){ const n=srsDue().length; rb.textContent=n; rb.classList.toggle('hidden',n===0); }
  mountIcons(document);
  updateVoiceUI(0);
  if(changed) window.scrollTo(0,0);
  if(R.view==='tank') mountTank(); else stopTank();
  /* 我的素材：六步页每次重绘后重新挂载视频 / 音频源 */
  if(typeof mountMediaPlayer==='function') mountMediaPlayer();
}
function navTo(v){
  if(typeof pauseMedia==='function') pauseMedia();
  if(v!=='lesson'){ clearRecordings(); stopRecTimer(); R.courseId=null; }
  R.view=v; R.keepAudio=false; hideWordPop(); paint();
}
function openCourse(id,step){
  if(typeof pauseMedia==='function') pauseMedia();
  if(R.courseId&&R.courseId!==id) clearRecordings();
  R.courseId=id; R.view='lesson'; R.step=step!=null?step:Math.min(5,prog(id).done.length);
  R.dictSeg=0; R.wordStart=0; R.recitePass=0; R.reciteDone=[]; R.shadowSeg=0; R.shadowMode='sentence';
  S.current=id; save(); R.keepAudio=false; hideWordPop(); paint();
}

/* ---------------- 词条浮层 ---------------- */
function showWordPop(w,x,y){
  const g=glossary(w),pop=$('#wordPop');
  pop.innerHTML='<div class="wp-top"><span class="wp-word">'+esc(w)+'</span><button class="wp-close" data-act="popClose">'+svg('close',13)+'</button></div>'+
    '<div class="wp-ph">'+(g.p?esc(g.p):'音标待补')+'</div><div class="wp-pos">'+esc(g.s)+'</div>'+
    '<div class="wp-def">'+esc(g.d)+'</div>'+
    '<div class="wp-actions"><button class="btn btn-soft btn-sm" data-act="popPlay" data-w="'+esc(w)+'">'+svg('volume',13)+' 发音</button>'+
    '<button class="btn btn-primary btn-sm" data-act="popAdd" data-w="'+esc(w)+'">'+svg('plus',13)+' 加入词库</button></div>';
  pop.classList.remove('hidden');
  const pw=250,ph=pop.offsetHeight||170;
  pop.style.left=Math.max(8,Math.min(x+10,window.innerWidth-pw-14))+window.scrollX+'px';
  pop.style.top=Math.max(8,Math.min(y+12,window.innerHeight-ph-14))+window.scrollY+'px';
  mountIcons(pop);
}
function hideWordPop(){ $('#wordPop').classList.add('hidden'); }

/* ---------------- 计时器 ---------------- */
function stopRecTimer(){ if(R.timer){ clearInterval(R.timer); R.timer=null; } R.timerSec=0; }
function toggleTimer(){
  if(R.timer){ clearInterval(R.timer); R.timer=null; toast('已停止计时'); paint(); return; }
  R.timer=setInterval(function(){ R.timerSec++; const t=$('#rsTimer'); if(t) t.textContent=fmtTime(R.timerSec); },1000);
  paint();
}

/* ---------------- 动作分发 ---------------- */
function handleAct(a,t,e){
  /* 我的素材库 / 媒体播放器的动作先分派，未命中再走原有逻辑 */
  if(typeof handleLibAct==='function' && handleLibAct(a,t,e)) return;
  const id=R.courseId,l=id?getLesson(id):null;
  switch(a){
    case 'gotoImport': {
      navTo('diy');
      setTimeout(function(){
        const box=document.querySelector('#libMediaFile');
        if(box){ box.scrollIntoView({behavior:'smooth',block:'center'});
          const wrap=box.closest('.lib-up');
          if(wrap){ wrap.classList.add('flash'); setTimeout(function(){ wrap.classList.remove('flash'); },1400); } }
      },120);
      break;
    }
    case 'continue': openCourse(activeCourseId()); break;
    case 'level': R.levelFilter=t.dataset.l; paint(); break;
    case 'clearSearch': R.search=''; R.levelFilter='ALL'; paint(); break;
    case 'open': openCourse(t.dataset.id); break;
    case 'openStep': openCourse(t.dataset.id,parseInt(t.dataset.n,10)); break;
    case 'goStep': R.step=parseInt(t.dataset.n,10); R.wordStart=0; paint(); break;
    case 'stepNext': markDone(id,R.step); if(R.step<5){ R.step++; R.wordStart=0; paint(); toast('已完成 '+activeSteps()[R.step-1].name+'，进入 '+activeSteps()[R.step].name); } break;
    case 'play': togglePlay(); break;
    case 'rate': R.rate=parseFloat(t.dataset.r); paint(); break;
    case 'voiceOpen': toggleVoicePanel(); break;
    case 'voiceTest': { testVoice(); break; }
    case 'loop': R.loop=!R.loop; paint(); toast(R.loop?'已开启循环播放':'已关闭循环播放'); break;
    case 'seek': {
      const total=voiceWords().length;
      R.wordStart=clamp(R.wordStart+parseInt(t.dataset.d,10),0,Math.max(0,total-1));
      paint(); break;
    }
    case 'seekbar': {
      const rect=t.getBoundingClientRect();
      const p=clamp((e.clientX-rect.left)/rect.width,0,1);
      R.wordStart=Math.round(p*Math.max(0,voiceWords().length-1));
      const f=$('#pbarFill'); if(f) f.style.width=(p*100)+'%';
      break;
    }
    case 'quiz': S.quiz[id]=parseInt(t.dataset.i,10); save(); paint(); break;
    case 'dictSeg': R.dictSeg=parseInt(t.dataset.i,10); R.wordStart=0; paint(); break;
    case 'addSlot': { const d=draftOf(id); d[R.dictSeg].push(''); save(); paint(); break; }
    case 'skipToggle': R.allowSkip=!R.allowSkip; paint(); toast(R.allowSkip?'允许跳格：可跳过听不清的格':'已关闭跳格：空格 / Tab 不再跳过空格'); break;
    case 'addWeak': { const ok=addWeak(t.dataset.w,getCourse(id)?getCourse(id).title:''); toast(ok?'已加入词库：'+t.dataset.w:'这个词已经在词库里了'); if(ok) paint(); break; }
    case 'addAllWeak': { const d=diffAll(id); let n=0; d.weak.forEach(function(w){ if(addWeak(w,getCourse(id).title)) n++; }); toast('已加入 '+n+' 个薄弱词'); paint(); break; }
    case 'delWeak': { const w=t.dataset.w; S.weak=S.weak.filter(function(x){return x.w!==w;}); save(); paint(); break; }
    case 'playWord': case 'popPlay': { const w=t.dataset.w; stopVoice(); speakShort(w,0.85); break; }
    case 'popAdd': { const ok=addWeak(t.dataset.w,getCourse(id)?getCourse(id).title:''); toast(ok?'已加入词库：'+t.dataset.w:'这个词已经在词库里了'); hideWordPop(); paint(); break; }
    case 'popClose': hideWordPop(); break;
    case 'anTab': R.analysisTab=t.dataset.t; paint(); break;
    case 'shMode': R.shadowMode=t.dataset.m; R.wordStart=0; paint(); break;
    case 'shFocus': R.shadowSeg=parseInt(t.dataset.i,10); R.wordStart=0; paint(); break;
    case 'shPlay': { R.shadowSeg=parseInt(t.dataset.i,10); R.wordStart=0; R.keepAudio=true; paint(); R.keepAudio=false; playVoice(l.sentences[R.shadowSeg].en); break; }
    case 'record': startRec(t.dataset.k); break;
    case 'rePass': R.recitePass=parseInt(t.dataset.p,10); stopRecTimer(); paint(); break;
    case 'reTimer': toggleTimer(); break;
    case 'reDone': {
      if(R.reciteDone.indexOf(R.recitePass)<0) R.reciteDone.push(R.recitePass);
      markDone(id,5);
      if(R.recitePass<2){ R.recitePass++; stopRecTimer(); toast('完成第 '+R.reciteDone.length+' 遍，继续放手'); }
      else toast('三遍都完成了，点「完成文章」收进今天的积累');
      paint(); break;
    }
    case 'finishLesson': {
      const p=prog(id); for(let i=0;i<6;i++) if(p.done.indexOf(i)<0) p.done.push(i);
      if(completedList().indexOf(id)<0){ completedList().push(id); S.points+=50; }
      if(S.days.indexOf(dstr())<0) S.days.push(dstr());
      save(); toast('完成文章！+50 积分，已收进今天的积累'); paint(); break;
    }
    case 'diyGen': {
      const title=($('#diyTitle')&&$('#diyTitle').value.trim())||'My DIY Passage';
      const en=$('#diyEn')?$('#diyEn').value.trim():'';
      const cn=$('#diyCn')?$('#diyCn').value.trim():'';
      if(wordsOf(en).length<4){ toast('请先粘贴至少一句英文原文'); return; }
      const lv=$('#diyLevel')?$('#diyLevel').value:'A2';
      const meta=LEVELS.find(function(x){return x.code===lv;})||LEVELS[2];
      const c={id:'diy_'+Date.now(),idx:'DIY',level:lv,levelName:meta.name,tone:meta.tone,title:title,cn:'我导入的文章',series:'DIY 导入',custom:makeDiyLesson(title,en,cn)};
      S.diy.push(c); save(); toast('已生成，正在打开六步学习'); openCourse(c.id,0); break;
    }
    case 'searchGo': { const v=$('#searchInput')?$('#searchInput').value.trim():''; R.search=v; R.view='courses'; R.levelFilter='ALL'; closeModal(); paint(); break; }
    case 'resetOk': { localStorage.removeItem(KEY); location.reload(); break; }
    case 'closeModal': closeModal(); break;
    case 'openTrack': openTrackSettings(); break;
    case 'setTrack': setTrack(t.dataset.t); break;
    default: handleModuleAct(a,t,e,id,l);
  }
}

/* ---------------- 事件绑定 ---------------- */
document.addEventListener('click',function(e){
  const nav=e.target.closest('[data-view]');
  if(nav && !nav.dataset.act){ navTo(nav.dataset.view); return; }
  const cw=e.target.closest('.clickable-word');
  if(cw){ showWordPop(cw.dataset.w,e.clientX,e.clientY); return; }
  const t=e.target.closest('[data-act]');
  if(!e.target.closest('#wordPop')) hideWordPop();
  if(!t){ if(e.target.id==='modalMask') closeModal(); return; }
  handleAct(t.dataset.act,t,e);
});
document.addEventListener('input',function(e){
  if(e.target.classList.contains('word-input')){
    const d=draftOf(R.courseId),i=parseInt(e.target.dataset.wi,10);
    if(!isNaN(i)){ d[R.dictSeg][i]=e.target.value; save(); e.target.classList.toggle('filled',e.target.value.trim()!==''); }
  }
});
document.addEventListener('keydown',function(e){
  const el=e.target;
  if(e.key==='Escape'){ hideWordPop(); closeModal(); return; }
  if(R.view!=='lesson') return;
  const isInput=el&&el.classList&&el.classList.contains('word-input');
  if(e.key==='Enter'&&!isQuest()&&R.step===1&&!el.matches('textarea')){ e.preventDefault(); togglePlay(); return; }
  if((e.key===' '||e.key==='Tab')&&isInput&&!isQuest()&&R.step===1){
    if(e.key==='Tab'&&!R.allowSkip&&el.value.trim()===''){ e.preventDefault(); toast('已关闭跳格，先写一个词或点「允许跳格：开」'); return; }
    if(e.key===' '){ e.preventDefault();
      const inputs=Array.from(document.querySelectorAll('.word-input'));
      const idx=inputs.indexOf(el), nxt=inputs[idx+1];
      if(nxt) nxt.focus(); else toast('这一句写完了，可以点「完成本步」进入核对');
    }
    return;
  }
  if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!isInput&&!isQuest()&&R.step===1){
    e.preventDefault();
    const ws=wordsOf(getLesson(R.courseId).sentences[R.dictSeg].en);
    R.wordStart=clamp(R.wordStart+(e.key==='ArrowRight'?2:-2),0,Math.max(0,ws.length-1));
    paint();
  }
});
window.addEventListener('beforeunload',function(){ clearRecordings(); stopVoice(); });
if(voiceSupported()){ try{ refreshVoices(); speechSynthesis.onvoiceschanged=function(){ refreshVoices(); populateVoiceSelect(); }; }catch(e){} }

$('#modePill').addEventListener('click',function(){ S.sixMode=!S.sixMode; save(); toast(S.sixMode?'已开启六步引导':'已切换自由练习：隐藏引导文案，六步仍可自由跳转'); paint(); });

/* ---------------- 学习轨道设置：两套六步并存、进度独立 ---------------- */
function openTrackSettings(){
  const cur=activeTrack(),cid=activeCourseId();
  const cards=TRACKS.map(function(t){
    const on=t.id===cur.id;
    const done=completedList(t.id).length;
    const stepN=prog(cid,t.id).done.length;
    return '<div class="track-card '+(on?'on':'')+'">'+
      '<div class="tc-head"><b>'+esc(t.name)+'</b><small>'+esc(t.en)+'</small>'+(on?'<span class="tag gold">使用中</span>':'')+'</div>'+
      '<div class="tc-flow">'+t.flow.map(function(x,i){return (i?'<i>→</i>':'')+'<span>'+esc(x)+'</span>';}).join('')+'</div>'+
      '<p>'+esc(t.desc)+'</p>'+
      '<div class="tc-meta">来源 '+esc(t.source)+' · 已学完 '+done+' 篇 · 当前课程 '+stepN+'/6 步</div>'+
      (on?'<button class="btn btn-line btn-sm" disabled>当前轨道</button>':
        '<button class="btn btn-primary btn-sm" data-act="setTrack" data-t="'+t.id+'">切换到这套 '+svg('arrowRight',13)+'</button>')+
    '</div>';
  }).join('');
  openModal('<h3>学习轨道设置</h3>'+
    '<p>两份材料给出的「六步」定义不一致，这里两套并存、随时切换。<b>六步完成状态与文章完成态各自独立记录</b>；词库、听写草稿、积分和打卡共用。</p>'+
    '<div class="track-list">'+cards+'</div>'+
    '<div class="notice" style="margin-top:14px">'+svg('compass',13)+' 切换只改变学习流程与进度归属，不会清空任何一边的数据。侧栏「练习 · PLAY」的四个模块在两套轨道下都能使用。</div>'+
    '<div class="modal-actions"><button class="btn btn-line btn-sm" data-act="closeModal">关闭</button></div>');
}
const trackBtn=$('#trackPill');
if(trackBtn) trackBtn.addEventListener('click',openTrackSettings);
$('#searchBtn').addEventListener('click',function(){
  openModal('<h3>搜索课程</h3><p>按标题、中文名或系列关键词查找。</p>'+
    '<input class="search-input" id="searchInput" placeholder="例如：rain / 经济学人 / 新概念" value="'+esc(R.search)+'">'+
    '<div class="modal-actions" style="margin-top:15px"><button class="btn btn-line btn-sm" data-act="closeModal">取消</button>'+
    '<button class="btn btn-primary btn-sm" data-act="searchGo">搜索</button></div>');
  setTimeout(function(){ const i=$('#searchInput'); if(i){ i.focus(); i.addEventListener('keydown',function(ev){ if(ev.key==='Enter'){ R.search=i.value.trim(); R.view='courses'; R.levelFilter='ALL'; closeModal(); paint(); } }); } },30);
});
$('#resetBtn').addEventListener('click',function(){
  openModal('<h3>重置演示数据？</h3><p>将清空所有学习进度、听写草稿、词库、积分与 DIY 课程，恢复初始状态。此操作不可撤销。</p>'+
    '<div class="modal-actions"><button class="btn btn-line btn-sm" data-act="closeModal">取消</button>'+
    '<button class="btn btn-primary btn-sm" data-act="resetOk">确认重置</button></div>');
});

/* ---------------- 启动 ---------------- */
mountIcons(document);
paint();
