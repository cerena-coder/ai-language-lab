/* ============================================================
   modules.js —— 《创始早鸟会员权益方案》P2 / P3
   四大游戏化模块 + 闯关六步的新增步骤内容
   依赖：data.js 的常量；app.js 的状态与工具函数（均在运行时调用）
   ============================================================ */

/* ---------------- 通用小工具 ---------------- */
function mRand(n){ return Math.floor(Math.random()*n); }
function mShuffle(a){ for(let i=a.length-1;i>0;i--){ const j=mRand(i+1),t=a[i];a[i]=a[j];a[j]=t; } return a; }
function mPick(a,n){ return mShuffle((a||[]).slice()).slice(0,n); }
function gPool(){
  return Object.keys(G).filter(function(w){ return w.length>=3 && G[w] && G[w].d && G[w].d!=='—' && G[w].s; });
}
function setTxt(id,v){ const e=document.getElementById(id); if(e) e.textContent=v; }
function speakText(txt){
  stopVoice();
  speakShort(txt,0.85);
}
function lessonWords(){
  /* 复习页等独立页面没有「当前课程」时，回退到今天的一段 */
  const l=getLesson(R.courseId||activeCourseId()); if(!l) return [];
  const out=[];
  l.sentences.forEach(function(s){ wordsOf(s.en).forEach(function(w){
    const k=norm(w); if(G[k] && out.indexOf(k)<0) out.push(k);
  }); });
  return out;
}

/* ---------------- 出题：4 选 1，英→中 / 中→英 混合 ---------------- */
function makeQuestion(word,reverse){
  const g=G[word]||{d:'（演示词库未收录）',s:'',p:''};
  const distract=mPick(gPool().filter(function(w){ return w!==word && G[w].d!==g.d; }),3);
  if(reverse){
    const opts=mShuffle([word].concat(distract));
    return {w:word,type:'cn2en',label:'选出对应的英文单词',q:g.d,def:g.d,
      opts:opts,answer:opts.indexOf(word)};
  }
  const opts=mShuffle([g.d].concat(distract.map(function(w){ return G[w].d; })));
  return {w:word,type:'en2cn',label:'选出正确的中文释义',q:word,def:g.d,
    opts:opts,answer:opts.indexOf(g.d)};
}
function makeQuestionSet(n,pool){
  const base=(pool&&pool.length?pool.slice():[]), all=gPool();
  const cand=mShuffle(base.length>=n?base:base.concat(all));
  const words=[];
  for(let i=0;i<cand.length&&words.length<n;i++) if(words.indexOf(cand[i])<0) words.push(cand[i]);
  return words.map(function(w,i){ return makeQuestion(w,i%2===1); });
}
function starsOf(ratio){ return ratio>=0.9?3:ratio>=0.7?2:ratio>=0.5?1:0; }
function starHTML(n){
  let s=''; for(let i=0;i<3;i++) s+='<span class="gs '+(i<n?'on':'')+'">★</span>'; return s;
}

/* ---------------- 智能复习：SRS 间隔重复 ---------------- */
function srsSeed(w){
  if(!w) return null;
  if(!S.srs[w]) S.srs[w]={lv:0,due:dstr(),reps:0,lapses:0,last:''};
  return S.srs[w];
}
function srsAdd(w){ if(w) srsSeed(w); save(); }
function srsAddMany(ws){ (ws||[]).forEach(srsSeed); save(); }
function srsDue(){
  const t=dstr();
  return Object.keys(S.srs).filter(function(w){ return S.srs[w] && S.srs[w].due<=t; });
}
function srsGrade(w,grade){
  const it=srsSeed(w); if(!it) return;
  if(grade===0){ it.lv=0; it.lapses=(it.lapses||0)+1; }
  else if(grade===1){ /* 保持当前档位 */ }
  else it.lv=clamp((it.lv||0)+1,0,SRS_INTERVALS.length-1);
  it.reps=(it.reps||0)+1; it.last=dstr();
  const d=new Date(); d.setDate(d.getDate()+SRS_INTERVALS[it.lv]);
  it.due=dstr(d); save();
}
function srsForecast(){
  const out=[];
  for(let i=0;i<7;i++){
    const d=new Date(); d.setDate(d.getDate()+i); const k=dstr(d);
    out.push({k:k,label:i===0?'今天':i===1?'明天':(d.getMonth()+1)+'/'+d.getDate(),
      n:Object.keys(S.srs).filter(function(w){ return S.srs[w] && S.srs[w].due===k; }).length});
  }
  return out;
}

/* ---------------- 首页：四大模块入口 + 轨道对比 ---------------- */
function moduleSection(){
  const due=srsDue().length;
  return '<div class="sec-head" style="margin-top:28px"><div>'+
    '<div class="sec-kicker">PLAY · 课堂、练习、闯关、复习</div>'+
    '<h2 class="sec-title">不只是背单词，都在一套系统里</h2>'+
    '<div class="sec-sub">来自《创始早鸟会员权益方案》P3：学习更流畅、练习更有趣、坚持更容易。</div></div>'+
    '<button class="btn btn-line btn-sm" data-act="openTrack">'+svg('settings',13)+' '+esc(activeTrack().name)+' · 切换轨道</button></div>'+
    '<div class="module-grid">'+MODULES.map(function(m){
      const badge=m.id==='review'&&due?'<span class="mc-badge">今日 '+due+' 词</span>':'';
      return '<button class="module-card '+m.tone+'" data-view="'+m.id+'">'+badge+
        '<span class="mc-ico">'+svg(m.icon,22)+'</span>'+
        '<span class="mc-en">'+esc(m.en)+'</span><b>'+esc(m.name)+'</b>'+
        '<span class="mc-tag">'+esc(m.tag)+'</span>'+
        '<span class="mc-desc">'+esc(m.desc)+'</span>'+
        '<span class="mc-go">进入 '+svg('arrowRight',13)+'</span></button>';
    }).join('')+'</div>';
}
function trackCompareHTML(){
  return '<div class="sec-head" style="margin-top:26px"><div><div class="sec-kicker">TWO TRACKS · 两套六步，进度独立</div>'+
    '<h2 class="sec-title" style="font-size:19px">两份材料的「六步」定义不一致</h2>'+
    '<div class="sec-sub">产品手册与会员方案给出了两套不同的六步。这里并存、可切换，各自的完成进度单独记录，互不覆盖。</div></div>'+
    '<button class="btn btn-primary btn-sm" data-act="openTrack">'+svg('settings',13)+' 轨道设置</button></div>'+
    '<div class="track-compare">'+TRACKS.map(function(t){
      const on=t.id===S.track;
      return '<div class="card tc-card '+(on?'on':'')+'">'+
        '<div class="eyebrow">'+esc(t.en)+'</div><h3>'+esc(t.name)+(on?' <span class="tag gold">使用中</span>':'')+'</h3>'+
        '<div class="tc-flow">'+t.flow.map(function(x,i){ return (i?'<i>→</i>':'')+'<span>'+esc(x)+'</span>'; }).join('')+'</div>'+
        '<p>'+esc(t.desc)+'</p><div class="tc-meta">来源 '+esc(t.source)+' · 已完成 '+completedList(t.id).length+' 篇</div></div>';
    }).join('')+'</div>';
}

/* ---------------- 模块 1：教室课堂 ---------------- */
function highlightChunks(en,chunks){
  const raw=String(en||'');
  const hits=[];
  (chunks||[]).forEach(function(c){
    const t=String(c.t||'').trim(); if(!t) return;
    const s=raw.toLowerCase().indexOf(t.toLowerCase());
    if(s>=0) hits.push({s:s,e:s+t.length,t:t});
  });
  if(!hits.length) return esc(raw);
  hits.sort(function(a,b){ return a.s-b.s; });
  let out='',pos=0;
  hits.forEach(function(h){
    if(h.s<pos) return;
    out+=esc(raw.slice(pos,h.s));
    out+='<span class="bk" data-act="chunkPlay" data-t="'+esc(h.t)+'" title="点击朗读这个意群">'+esc(raw.slice(h.s,h.e))+'</span>';
    pos=h.e;
  });
  return out+esc(raw.slice(pos));
}
function classCourseId(){
  if(R.classCourse) return R.classCourse;
  const code=R.classCode||'PreA1';
  const c=COURSES.find(function(x){return x.level===code;})||COURSES[0];
  return c.id;
}
function renderClassroom(){
  const cid=classCourseId(), c=getCourse(cid)||COURSES[0], l=getLesson(cid);
  const code=R.classCode||c.level||'PreA1';
  const unit=CLASSROOM_UNITS.find(function(u){return u.code===code;})||CLASSROOM_UNITS[0];
  const si=clamp(R.classSi,0,l.sentences.length-1), s=l.sentences[si];
  const units=CLASSROOM_UNITS.map(function(u){
    const n=COURSES.filter(function(x){return x.level===u.code;}).length;
    return '<button class="unit-item '+(u.code===code?'active':'')+'" data-act="classUnit" data-code="'+u.code+'">'+
      '<b>'+esc(u.code)+' · '+esc(u.name)+'</b><span>'+esc(u.topic)+' · '+n+' 篇</span></button>';
  }).join('');
  const sentList=l.sentences.map(function(x,i){
    return '<button class="cs-item '+(i===si?'active':'')+'" data-act="classSent" data-i="'+i+'">'+
      '<span>'+String(i+1).padStart(2,'0')+'</span>'+esc(x.en.slice(0,38))+(x.en.length>38?'…':'')+'</button>';
  }).join('');
  const chunks=(s.chunks||[]).map(function(ch,i){
    return '<div class="chalk-chunk" data-act="chunkPlay" data-t="'+esc(ch.t)+'"><b>'+esc(ch.t)+'</b><span>'+esc(ch.c)+'</span></div>';
  }).join('');
  return '<div class="sec-head"><div><div class="sec-kicker">CLASSROOM · 教室课堂</div>'+
    '<h2 class="sec-title">跟着老师学，课文听得懂</h2>'+
    '<div class="sec-sub">黑板式逐句精讲：先断句、再拆意群、最后把语法点放回原句。点任意意群即可朗读。</div></div>'+
    '<button class="btn btn-line btn-sm" data-view="courses">'+svg('book',13)+' 全部课程</button></div>'+
    '<div class="classroom-layout">'+
      '<div class="board-card">'+
        '<div class="board-top"><span>'+esc(code)+' · '+esc(unit.name)+' · '+esc(unit.topic)+'</span>'+
          '<span>第 '+(si+1)+' / '+l.sentences.length+' 句</span></div>'+
        '<div class="board-surface">'+
          '<div class="board-eyebrow">SENTENCE ON THE BOARD · 点彩色意群可朗读</div>'+
          '<div class="board-en">'+highlightChunks(s.en,s.chunks)+'</div>'+
          '<div class="board-cn">'+esc(s.cn)+'</div>'+
          '<div class="board-div"></div>'+
          '<div class="board-label">断句分析 · 意群拆解</div>'+
          '<div class="chalk-grid">'+chunks+'</div>'+
          '<div class="board-note"><b>语法点</b>'+esc(s.note||'这一句先抓住主谓，再看修饰成分。')+'</div>'+
          '<div class="board-foot">'+svg('volume',13)+' 点彩色意群朗读 · 用「下一句」逐句推进 · 听懂之后进入 '+esc(activeTrack().name)+'</div>'+
        '</div>'+
        '<div class="board-ctrl">'+
          '<button class="btn btn-line btn-sm" data-act="classPrev" '+(si===0?'disabled':'')+'>'+svg('arrowLeft',13)+' 上一句</button>'+
          '<button class="btn btn-primary btn-sm" data-act="classPlay">'+svg('volume',14)+' 朗读这一句</button>'+
          '<button class="btn btn-line btn-sm" data-act="classNext" '+(si===l.sentences.length-1?'disabled':'')+'>下一句 '+svg('arrowRight',13)+'</button>'+
          '<button class="btn btn-gold btn-sm" data-act="classEnter" data-id="'+esc(cid)+'">进入六步精练 '+svg('arrowRight',13)+'</button>'+
        '</div>'+
      '</div>'+
      '<div class="class-side">'+
        '<div class="card class-panel"><div class="eyebrow">CLASSES · 按难度分班</div><div class="unit-list">'+units+'</div></div>'+
        '<div class="card class-panel"><div class="eyebrow">THIS LESSON · '+esc(c.title)+'</div>'+
          '<div class="cs-list">'+sentList+'</div>'+
          '<div class="class-meta">词汇量 '+esc(unit.vocab)+' · '+esc(unit.stage)+' · 约 '+l.minutes+' 分钟</div></div>'+
      '</div>'+
    '</div>'+
    '<div class="notice" style="margin-top:16px">'+svg('compass',13)+' 课堂内容取自内置示例课文的 chunks 与语法笔记，发音为浏览器语音合成；真实教师讲解视频 / 板书可后续接入。当前轨道：<b>'+esc(activeTrack().name)+'</b>。</div>';
}

/* ---------------- 模块 2：单词闯关 ---------------- */
function gateUnlocked(lv,stars){ return lv.id===1 || (stars[lv.id-1]||0)>=1; }
function renderGate(){
  const stars=S.gate.stars||{}, g=R.gate;
  const cleared=Object.keys(stars).filter(function(k){return stars[k]>=1;}).length;
  const map=GATE_LEVELS.map(function(lv){
    const ok=gateUnlocked(lv,stars), st=stars[lv.id]||0;
    return '<div class="gate-level '+(ok?'':'locked')+' '+(g.lv===lv.id&&g.qs.length?'active':'')+'">'+
      '<div class="gl-top"><span class="gl-no">'+String(lv.id).padStart(2,'0')+'</span>'+
        (ok?svg(lv.icon,19):svg('lock',17))+'</div>'+
      '<b>'+esc(lv.name)+'</b><span class="gl-desc">'+esc(lv.desc)+'</span>'+
      '<div class="gl-foot">'+starHTML(st)+'<span>'+lv.n+' 题 · '+esc(lv.code)+'</span></div>'+
      (ok?'<button class="btn btn-primary btn-sm" data-act="gateStart" data-lv="'+lv.id+'">'+(st?'再挑战':'开始闯关')+'</button>':
        '<button class="btn btn-line btn-sm" disabled>通过上一关解锁</button>')+'</div>';
  }).join('');
  let arena='';
  if(g.qs.length&&!g.finished){
    const q=g.qs[g.i], picked=g.pick!==null&&g.pick!==undefined;
    arena='<div class="card gate-arena"><div class="ga-head"><span class="tag gold">第 '+g.lv+' 关 · '+esc(GATE_LEVELS[g.lv-1].name)+'</span>'+
      '<span>第 '+(g.i+1)+' / '+g.qs.length+' 题</span><span>连击 <b>'+g.combo+'</b></span></div>'+
      '<div class="ga-label">'+esc(q.label)+'</div><div class="ga-q">'+esc(q.q)+'</div>'+
      '<div class="ga-opts">'+q.opts.map(function(o,i){
        let cls='';
        if(picked){ if(i===q.answer) cls=' correct'; else if(i===g.pick) cls=' wrong'; }
        return '<button class="ga-opt'+cls+'" data-act="gatePick" data-i="'+i+'" '+(picked?'disabled':'')+'>'+
          '<span>'+'ABCD'[i]+'</span>'+esc(o)+'</button>';
      }).join('')+'</div>'+
      (picked?'<div class="ga-fb '+(g.pick===q.answer?'good':'bad')+'">'+
        (g.pick===q.answer?'答对了！':'正确答案：'+esc(q.opts[q.answer]))+' · '+esc(q.w)+' = '+esc(q.def)+'</div>'+
        '<button class="btn btn-primary btn-sm" data-act="gateNext">'+(g.i+1>=g.qs.length?'查看结算':'下一题')+' '+svg('arrowRight',13)+'</button>':
        '<div class="ga-tip">答错的词会自动进词库，并排进智能复习队列。</div>')+
      '<button class="btn btn-line btn-sm" data-act="gateExit" style="margin-left:8px">退出本关</button></div>';
  } else if(g.finished){
    const ratio=g.correct/g.qs.length, st=starsOf(ratio);
    arena='<div class="card gate-result"><div class="gr-stars">'+starHTML(st)+'</div>'+
      '<h3>'+(st>=2?'这一关拿下了':st===1?'过关，再稳一点':'差一点，再来一次')+'</h3>'+
      '<p>答对 '+g.correct+' / '+g.qs.length+' 题 · 正确率 '+Math.round(ratio*100)+'% · 最高连击 '+g.combo+'</p>'+
      '<div class="gr-actions"><button class="btn btn-primary btn-sm" data-act="gateRetry">再来一次</button>'+
      (st>=1&&g.lv<8?'<button class="btn btn-gold btn-sm" data-act="gateStart" data-lv="'+(g.lv+1)+'">进入下一关 '+svg('arrowRight',13)+'</button>':'')+
      '<button class="btn btn-line btn-sm" data-act="gateExit">返回关卡地图</button></div></div>';
  } else {
    arena='<div class="card gate-intro">'+svg('flag',30)+'<h3>一关接一关，挑战成就感</h3>'+
      '<p>每关从内置词库抽 '+GATE_LEVELS[0].n+'–'+GATE_LEVELS[7].n+' 道词义题，英→中、中→英混合。答对至少一半即可解锁下一关，答错的词自动进入词库与智能复习。</p>'+
      '<button class="btn btn-primary btn-sm" data-act="gateStart" data-lv="1">从第一关开始 '+svg('arrowRight',13)+'</button></div>';
  }
  return '<div class="sec-head"><div><div class="sec-kicker">WORD QUEST · 单词闯关</div>'+
    '<h2 class="sec-title">一关接一关，挑战成就感</h2>'+
    '<div class="sec-sub">场景练习、单词巩固；8 个关卡对应 7 个难度档 + 1 个混合挑战。</div></div>'+
    '<button class="btn btn-line btn-sm" data-view="review">'+svg('refresh',13)+' 去智能复习</button></div>'+
    '<div class="stat-row" style="grid-template-columns:repeat(4,1fr)">'+
      '<div class="stat"><div class="k">已通关</div><div class="v">'+cleared+'<small>/ 8 关</small></div><div class="d">至少 1 星即可解锁下一关</div></div>'+
      '<div class="stat"><div class="k">累计星星</div><div class="v">'+Object.keys(stars).reduce(function(a,k){return a+stars[k];},0)+'<small>/ 24</small></div><div class="d">正确率越高，星级越高</div></div>'+
      '<div class="stat"><div class="k">题库词条</div><div class="v">'+gPool().length+'<small>个</small></div><div class="d">4 选 1 自动出题</div></div>'+
      '<div class="stat"><div class="k">错词去向</div><div class="v">'+S.weak.length+'<small>个</small></div><div class="d">自动进词库 + 复习队列</div></div>'+
    '</div>'+arena+'<div class="gate-map">'+map+'</div>'+
    '<div class="notice" style="margin-top:16px">'+svg('compass',13)+' 题目由内置演示词库自动生成，不调用外部题库；关卡与星级保存在本地，刷新后仍在。</div>';
}

/* ---------------- 模块 3：坦克大战（Canvas） ---------------- */
function renderTank(){
  return '<div class="sec-head"><div><div class="sec-kicker">TANK BATTLE · 休息时间</div>'+
    '<h2 class="sec-title">玩中巩固，让记忆更深刻</h2>'+
    '<div class="sec-sub">选出正确释义就能击毁对应坦克；答错或让坦克突破防线会掉一格生命。</div></div>'+
    '<button class="btn btn-line btn-sm" data-view="gate">'+svg('flag',13)+' 去单词闯关</button></div>'+
    '<div class="tank-shell">'+
      '<div class="tank-hud">'+
        '<span>得分 <b id="tkScore">0</b></span><span>生命 <b id="tkLives">♥♥♥</b></span>'+
        '<span>波次 <b id="tkWave">1</b></span><span>连击 <b id="tkCombo">0</b></span>'+
        '<span class="tk-best">最高分 <b id="tkBest">0</b></span>'+
        '<span class="tk-ctrl"><button class="mini-btn" data-act="tankPause">暂停 / 继续</button>'+
        '<button class="mini-btn" data-act="tankStart">重新开始</button></span>'+
      '</div>'+
      '<div class="tank-canvas-wrap"><canvas id="tankCanvas" width="720" height="300"></canvas>'+
        '<div class="tank-overlay" id="tkOverlay"></div></div>'+
      '<div class="tank-q" id="tankQ"></div>'+
    '</div>'+
    '<div class="tank-legend">'+svg('gamepad',14)+' 玩法：读题 → 点下方 A/B/C/D 发射炮弹 → 命中正确坦克得分并连击；每 4 连击提升一个波次，坦克移动变快。3 条命用尽结算，积分按得分折算。</div>'+
    '<div class="notice" style="margin-top:14px">'+svg('compass',13)+' 本地 Canvas 小游戏，仅用内置词库出题，不联网、不上传任何数据；最高分与游玩次数保存在本地。</div>';
}
function resetTankEnemies(){
  const g=R.tankG, ys=[34,96,158,220];
  g.enemies=(g.q?g.q.opts:[]).map(function(o,i){
    return {opt:i,label:o,x:420+mRand(270),y:ys[i]||34,alive:true};
  });
}
function nextTankQuestion(){
  const g=R.tankG;
  const w=mPick(gPool(),1)[0]||'hello';
  g.q=makeQuestion(w,mRand(2)===1);
  g.bullets=[]; g.locked=false;
  resetTankEnemies(); renderTankQuestion(); updateTankHUD();
}
function renderTankQuestion(){
  const box=$('#tankQ'),g=R.tankG; if(!box) return;
  if(!g.q){ box.innerHTML='<div class="tq-idle">点「开始游戏」进入这一局。</div>'; return; }
  const q=g.q;
  box.innerHTML='<div class="tq-label">'+esc(q.label)+'</div>'+
    '<div class="tq-word">'+esc(q.q)+'</div>'+
    '<div class="tq-opts">'+q.opts.map(function(o,i){
      return '<button class="tank-opt" data-act="tankFire" data-i="'+i+'"><b>'+'ABCD'[i]+'</b>'+esc(o)+'</button>';
    }).join('')+'</div><div class="tq-fb" id="tkFb">点一个答案，炮弹会飞向对应编号的坦克</div>';
}
function updateTankHUD(){
  const g=R.tankG;
  setTxt('tkScore',g.score);
  setTxt('tkLives',g.lives>0?new Array(g.lives+1).join('♥'):'—');
  setTxt('tkWave',g.wave); setTxt('tkCombo',g.combo); setTxt('tkBest',S.tank.best||0);
}
function updateTankOverlay(){
  const o=$('#tkOverlay'),g=R.tankG; if(!o) return;
  if(g.over){
    o.classList.remove('hidden');
    o.innerHTML='<div class="tk-panel"><div class="eyebrow">GAME OVER</div><h3>本局 '+g.score+' 分</h3>'+
      '<p>最高分 '+(S.tank.best||0)+' · 到达第 '+g.wave+' 波 · 已折算 '+Math.floor(g.score/20)+' 学习积分</p>'+
      '<button class="btn btn-primary btn-sm" data-act="tankStart">再来一局 '+svg('refresh',13)+'</button></div>';
  } else if(g.paused){
    o.classList.remove('hidden');
    o.innerHTML='<div class="tk-panel"><div class="eyebrow">PAUSED</div><h3>已暂停</h3>'+
      '<button class="btn btn-primary btn-sm" data-act="tankPause">继续游戏</button></div>';
  } else if(!g.running){
    o.classList.remove('hidden');
    o.innerHTML='<div class="tk-panel"><div class="eyebrow">READY · 休息时间</div><h3>坦克大战</h3>'+
      '<p>边玩边把词再过一遍，3 条命，看看能拿多少分。</p>'+
      '<button class="btn btn-gold btn-sm" data-act="tankStart">开始游戏 '+svg('play',13)+'</button></div>';
  } else o.classList.add('hidden');
}
function drawTankShape(c,x,y,color,en){
  c.save();
  c.fillStyle='rgba(0,0,0,.22)'; c.fillRect(x+2,y+30,44,5);
  c.fillStyle=color; c.fillRect(x,y+13,44,15); c.fillRect(x+9,y+6,26,10);
  c.fillStyle='rgba(13,37,55,.35)';
  for(let i=0;i<4;i++) c.fillRect(x+5+i*11,y+27,7,4);
  if(en){
    c.fillRect(x-13,y+17,15,4);
    c.fillStyle='rgba(234,255,243,.92)'; c.font='12px "PingFang SC","Microsoft YaHei",sans-serif';
    c.fillText(String.fromCharCode(65+en.opt)+' · '+String(en.label).slice(0,9),x,y+48);
  } else c.fillRect(x+42,y+17,16,4);
  c.restore();
}
function drawTank(){
  const g=R.tankG,c=g.ctx; if(!c) return;
  const W=720,H=300;
  c.clearRect(0,0,W,H);
  const gr=c.createLinearGradient(0,0,W,H);
  gr.addColorStop(0,'#0d2537'); gr.addColorStop(.6,'#123a45'); gr.addColorStop(1,'#175347');
  c.fillStyle=gr; c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(169,232,200,.10)'; c.lineWidth=1;
  for(let x=0;x<W;x+=60){ c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke(); }
  for(let y=0;y<H;y+=50){ c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke(); }
  c.fillStyle='rgba(209,154,55,.30)'; c.fillRect(0,0,7,H);
  c.fillStyle='rgba(169,232,200,.10)'; c.fillRect(0,H-30,W,30);
  g.enemies.forEach(function(en){ if(en.alive) drawTankShape(c,en.x,en.y,'#e0a83c',en); });
  drawTankShape(c,326,250,'#a9e8c8',null);
  g.bullets.forEach(function(b){
    c.fillStyle='#fff8dc'; c.shadowColor='#e0a83c'; c.shadowBlur=10;
    c.beginPath(); c.arc(b.x,b.y,4.5,0,Math.PI*2); c.fill(); c.shadowBlur=0;
  });
}
function tickTank(dt){
  const g=R.tankG;
  let breach=false;
  const speed=20+g.wave*4;
  g.enemies.forEach(function(en){ if(en.alive){ en.x-=speed*dt; if(en.x<-70) breach=true; } });
  if(breach&&!g.locked){
    g.lives--; g.combo=0; updateTankHUD();
    if(g.lives<=0){ endTank(); return; }
    resetTankEnemies(); renderTankQuestion(); toast('坦克突破了防线，−1 生命');
  }
  for(let k=g.bullets.length-1;k>=0;k--){
    const b=g.bullets[k]; b.t+=dt*2.4;
    const p=Math.min(1,b.t);
    b.x=b.sx+(b.tx-b.sx)*p; b.y=b.sy+(b.ty-b.sy)*p;
    if(b.t>=1){
      g.bullets.splice(k,1);
      if(b.correct){
        if(b.target) b.target.alive=false;
        g.score+=100+g.combo*10; g.combo++;
        if(g.combo%4===0) g.wave++;
        updateTankHUD();
        setTimeout(function(){ if(g.running&&!g.over&&R.view==='tank') nextTankQuestion(); },280);
      } else {
        g.lives--; g.combo=0; updateTankHUD();
        if(g.lives<=0){ endTank(); return; }
        setTimeout(function(){ if(g.running&&!g.over&&R.view==='tank'){ g.locked=false; renderTankQuestion(); } },850);
      }
    }
  }
}
function startTankLoop(){
  const g=R.tankG;
  if(g.raf) cancelAnimationFrame(g.raf);
  g.last=performance.now();
  const loop=function(now){
    if(!g.running||R.view!=='tank'){ g.raf=null; return; }
    const dt=Math.min(.05,(now-g.last)/1000); g.last=now;
    if(!g.paused) tickTank(dt);
    drawTank();
    g.raf=requestAnimationFrame(loop);
  };
  g.raf=requestAnimationFrame(loop);
}
function stopTank(){
  const g=R.tankG;
  if(g.raf){ cancelAnimationFrame(g.raf); g.raf=null; }
  g.running=false; g.paused=false;
}
function startTank(){
  const g=R.tankG;
  stopTank();
  g.running=true; g.paused=false; g.over=false;
  g.score=0; g.lives=3; g.wave=1; g.combo=0; g.locked=false; g.bullets=[];
  const w=mPick(gPool(),1)[0]||'hello';
  g.q=makeQuestion(w,mRand(2)===1);
  resetTankEnemies();
  S.tank.plays=(S.tank.plays||0)+1; save();
  updateTankHUD(); renderTankQuestion(); updateTankOverlay(); startTankLoop();
}
function endTank(){
  const g=R.tankG;
  g.running=false; g.over=true; g.locked=true;
  if(g.score>(S.tank.best||0)) S.tank.best=g.score;
  S.points+=Math.floor(g.score/20); save();
  const pv=$('#pointsVal'); if(pv) pv.textContent=S.points;
  updateTankOverlay(); updateTankHUD();
}
function mountTank(){
  const cv=$('#tankCanvas'); if(!cv) return;
  const g=R.tankG; g.canvas=cv; g.ctx=cv.getContext('2d');
  if(!g.q){ const w=mPick(gPool(),1)[0]||'hello'; g.q=makeQuestion(w,false); }
  if(!g.enemies.length) resetTankEnemies();
  updateTankHUD(); renderTankQuestion(); updateTankOverlay(); drawTank();
  if(g.running&&!g.paused) startTankLoop();
}

/* ---------------- 模块 4：智能复习 ---------------- */
function renderReview(){
  const due=srsDue(), total=Object.keys(S.srs).length;
  const mastered=Object.keys(S.srs).filter(function(w){ return (S.srs[w].lv||0)>=3; }).length;
  const rv=R.review;
  if(!rv.queue.length&&due.length) rv.queue=due.slice(0,20);
  const w=rv.queue[rv.i], info=w?glossary(w):null;
  const fc=srsForecast(), maxN=Math.max(1,Math.max.apply(null,fc.map(function(x){return x.n;})));
  let card='';
  if(w){
    card='<div class="card review-card"><div class="rv-head"><span class="tag gold">今日复习 '+(rv.i+1)+' / '+rv.queue.length+'</span>'+
      '<span>已完成 '+rv.done+' 张</span></div>'+
      '<div class="rv-word">'+esc(w)+'</div><div class="rv-ph">'+esc(info.p||'音标待补')+' · '+esc(info.s||'')+'</div>'+
      '<div class="rv-def '+(rv.revealed?'shown':'')+'">'+(rv.revealed?esc(info.d):'先自己想一遍，再点开释义')+'</div>'+
      (rv.revealed?'<div class="rv-grades">'+SRS_GRADES.map(function(gr){
        return '<button class="rv-grade '+gr.cls+'" data-act="rvGrade" data-g="'+gr.id+'"><b>'+gr.name+'</b><span>'+gr.hint+'</span></button>';
      }).join('')+'</div>':'<button class="btn btn-primary btn-sm" data-act="rvReveal">'+svg('eye',13)+' 显示释义</button>')+
      '<div class="rv-foot"><button class="btn btn-line btn-sm" data-act="rvNext">跳过这张</button>'+
      '<button class="btn btn-soft btn-sm" data-act="rvRefill">重新生成今日队列</button></div></div>';
  } else {
    card='<div class="card empty">'+svg('refresh',30)+'<h3>今天没有到期的词卡</h3>'+
      '<p>'+(total?'所有词都排到后面几天了，可以把本课生词加进来先预习。':'复习队列还是空的：从词库或当前课文导入一批词，系统会按间隔重复排期。')+'</p>'+
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'+
      '<button class="btn btn-primary btn-sm" data-act="rvSeed">'+svg('book',13)+' 导入本课生词</button>'+
      '<button class="btn btn-line btn-sm" data-act="rvSeedWeak">'+svg('layers',13)+' 导入词库全部词</button></div></div>';
  }
  return '<div class="sec-head"><div><div class="sec-kicker">SMART REVIEW · 智能复习</div>'+
    '<h2 class="sec-title">科学提醒，牢牢记住</h2>'+
    '<div class="sec-sub">间隔重复：认识就拉长下次见面时间，忘了就明天再见一次；不靠一次性死记。</div></div>'+
    '<button class="btn btn-line btn-sm" data-view="vocab">'+svg('layers',13)+' 查看词库</button></div>'+
    '<div class="stat-row" style="grid-template-columns:repeat(4,1fr)">'+
      '<div class="stat"><div class="k">今日到期</div><div class="v">'+due.length+'<small>词</small></div><div class="d">到期词会显示在侧栏角标</div></div>'+
      '<div class="stat"><div class="k">队列总数</div><div class="v">'+total+'<small>词</small></div><div class="d">词库 + 闯关错词自动汇入</div></div>'+
      '<div class="stat"><div class="k">已牢固</div><div class="v">'+mastered+'<small>词</small></div><div class="d">间隔已拉长到 7 天以上</div></div>'+
      '<div class="stat"><div class="k">累计复习</div><div class="v">'+Object.keys(S.srs).reduce(function(a,k){return a+(S.srs[k].reps||0);},0)+'<small>次</small></div><div class="d">每次反馈都会重排间隔</div></div>'+
    '</div>'+card+
    '<div class="card forecast"><div class="eyebrow">未来 7 天 · 到期预告</div><div class="fc-bars">'+fc.map(function(x){
      return '<div class="fc-col"><div class="fc-bar"><i style="height:'+(x.n/maxN*100)+'%"></i></div>'+
        '<b>'+x.n+'</b><span>'+esc(x.label)+'</span></div>';
    }).join('')+'</div></div>'+
    '<div class="notice" style="margin-top:16px">'+svg('compass',13)+' 采用简化 SM-2 间隔表（1/2/4/7/15/30/60/120 天），全部在本地计算并保存；没有云端提醒推送，到期提示以页面角标与首页卡片呈现。</div>';
}

/* ---------------- 闯关六步：新增的三个步骤内容 ---------------- */
function bodyBreakdown(){
  const l=getLesson(R.courseId);
  const si=clamp(R.breakdownSeg,0,l.sentences.length-1), s=l.sentences[si];
  const pills=l.sentences.map(function(_,i){
    return '<button class="seg-pill '+(i===si?'active':'')+'" data-act="bdSeg" data-i="'+i+'">第 '+(i+1)+' 句</button>';
  }).join('');
  const chunks=(s.chunks||[]).map(function(ch){
    return '<div class="bd-chunk" data-act="chunkPlay" data-t="'+esc(ch.t)+'"><b>'+esc(ch.t)+'</b><span>'+esc(ch.c)+'</span></div>';
  }).join('');
  return '<div class="blind-hint">'+svg('book',15)+' 断句分析，吃透语法：把长句按意群切开，看清每块在做什么，再把语法点放回原句。点彩色片段可朗读。</div>'+
    '<div class="dict-seg"><span class="s-label">第 '+(si+1)+' / '+l.sentences.length+' 句</span>'+pills+'</div>'+
    '<div class="card bd-card"><div class="bd-en">'+highlightChunks(s.en,s.chunks)+'</div>'+
      '<div class="bd-cn">'+esc(s.cn)+'</div>'+
      '<div class="bd-tools"><button class="btn btn-line btn-sm" data-act="bdPlay">'+svg('volume',13)+' 朗读整句</button>'+
        '<button class="btn btn-soft btn-sm" data-act="bdWords">'+svg('plus',13)+' 本课生词进复习</button></div>'+
      '<div class="bd-label">意群 / 语法点</div><div class="bd-chunks">'+chunks+'</div>'+
      '<div class="bd-note"><b>老师笔记</b>'+esc(s.note||'先抓主干，再看修饰成分。')+'</div></div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:10px">拆解用的是示例课文里的 chunks 与语法笔记；点任意英文单词仍可查释义、发音、收词。</div>';
}
function lessonQuizEnsure(){
  if(R.lessonQuiz.qs.length) return;
  const ws=lessonWords();
  R.lessonQuiz={qs:makeQuestionSet(Math.min(4,Math.max(2,Math.min(ws.length,12))),ws),
    i:0,pick:null,correct:0,best:0,finished:false};
}
function bodyQuestGate(){
  lessonQuizEnsure();
  const q=R.lessonQuiz, qs=q.qs;
  if(!qs.length) return '<div class="card empty"><h3>这一课暂时没有可出题的词</h3><p>可以在词库里先收几个词，再回来闯关。</p></div>';
  if(q.finished){
    const ratio=q.correct/qs.length, st=starsOf(ratio);
    return '<div class="card gate-result compact"><div class="gr-stars">'+starHTML(st)+'</div>'+
      '<h3>本课闯关完成</h3><p>答对 '+q.correct+' / '+qs.length+' 题 · 正确率 '+Math.round(ratio*100)+'%</p>'+
      '<p style="color:var(--muted);font-size:11.5px">答错的词已自动进词库与智能复习队列，下一步「复习」会把它们再过一遍。</p>'+
      '<button class="btn btn-line btn-sm" data-act="lqRetry">再练一轮</button></div>';
  }
  const cur=qs[q.i], picked=q.pick!==null&&q.pick!==undefined;
  return '<div class="blind-hint">'+svg('flag',15)+' 场景练习，单词巩固：用这一课的词做一轮小测，答错的词自动进入复习队列。</div>'+
    '<div class="card gate-arena"><div class="ga-head"><span class="tag gold">本课小测</span>'+
      '<span>第 '+(q.i+1)+' / '+qs.length+' 题</span><span>答对 <b>'+q.correct+'</b></span></div>'+
      '<div class="ga-label">'+esc(cur.label)+'</div><div class="ga-q">'+esc(cur.q)+'</div>'+
      '<div class="ga-opts">'+cur.opts.map(function(o,i){
        let cls=''; if(picked){ if(i===cur.answer) cls=' correct'; else if(i===q.pick) cls=' wrong'; }
        return '<button class="ga-opt'+cls+'" data-act="lqPick" data-i="'+i+'" '+(picked?'disabled':'')+'>'+
          '<span>'+'ABCD'[i]+'</span>'+esc(o)+'</button>';
      }).join('')+'</div>'+
      (picked?'<div class="ga-fb '+(q.pick===cur.answer?'good':'bad')+'">'+
        (q.pick===cur.answer?'答对了！':'正确答案：'+esc(cur.opts[cur.answer]))+' · '+esc(cur.w)+' = '+esc(cur.def)+'</div>'+
        '<button class="btn btn-primary btn-sm" data-act="lqNext">'+(q.i+1>=qs.length?'查看结算':'下一题')+' '+svg('arrowRight',13)+'</button>':'')+
    '</div>'+
    '<div class="notice" style="margin-top:12px">'+svg('compass',13)+' 这一轮不影响六步进度，可以随时「完成本步」进入复习；答完能拿到更准确的薄弱词定位。</div>';
}
function stepReview(){ if(!R.stepReview) R.stepReview={list:[],i:0,revealed:false,done:0}; return R.stepReview; }
function bodyQuestReview(){
  const rv=stepReview(), due=srsDue();
  if(!rv.list.length) rv.list=due.slice(0,5);
  const w=rv.list[rv.i], info=w?glossary(w):null;
  if(!w){
    return '<div class="blind-hint">'+svg('refresh',15)+' 间隔重复，强化记忆：今天暂时没有到期的词卡。</div>'+
      '<div class="card empty" style="margin-top:12px"><h3>把这一课的生词排进复习</h3>'+
      '<p>导入后，系统会按 1 / 2 / 4 / 7 / 15 / 30 天的间隔安排下一次见面。</p>'+
      '<button class="btn btn-primary btn-sm" data-act="qrSeed">'+svg('plus',13)+' 导入本课生词</button></div>'+
      '<div class="notice" style="margin-top:12px">也可以直接「完成本步」进入背诵；稍后到「智能复习」页统一复习。</div>';
  }
  return '<div class="blind-hint">'+svg('refresh',15)+' 间隔重复，强化记忆：先回想，再看释义，最后给一个诚实的反馈。</div>'+
    '<div class="card review-card compact"><div class="rv-head"><span class="tag gold">第 '+(rv.i+1)+' / '+rv.list.length+' 张</span>'+
      '<span>已完成 '+rv.done+' 张</span></div>'+
      '<div class="rv-word">'+esc(w)+'</div><div class="rv-ph">'+esc(info.p||'音标待补')+' · '+esc(info.s||'')+'</div>'+
      '<div class="rv-def '+(rv.revealed?'shown':'')+'">'+(rv.revealed?esc(info.d):'先自己想一遍，再点开释义')+'</div>'+
      (rv.revealed?'<div class="rv-grades">'+SRS_GRADES.map(function(gr){
        return '<button class="rv-grade '+gr.cls+'" data-act="qrGrade" data-g="'+gr.id+'"><b>'+gr.name+'</b><span>'+gr.hint+'</span></button>';
      }).join('')+'</div>':'<button class="btn btn-primary btn-sm" data-act="qrReveal">'+svg('eye',13)+' 显示释义</button>')+
      '<div class="rv-foot"><button class="btn btn-line btn-sm" data-act="qrNext">下一张</button>'+
      '<button class="btn btn-soft btn-sm" data-act="qrSeed">'+svg('plus',13)+' 导入本课生词</button></div></div>'+
    '<div class="notice" style="margin-top:12px">复习间隔按反馈实时重排并保存在本地；这些数据同时供「智能复习」页使用。</div>';
}

/* ---------------- 模块动作分发 ---------------- */
function handleModuleAct(a,t,e,id,l){
  switch(a){

    /* 教室课堂 */
    case 'classUnit': {
      R.classCode=t.dataset.code; R.classSi=0;
      const c=COURSES.find(function(x){return x.level===R.classCode;});
      R.classCourse=c?c.id:null; paint(); break;
    }
    case 'classSent': R.classSi=parseInt(t.dataset.i,10); paint(); break;
    case 'classPrev': R.classSi=Math.max(0,R.classSi-1); paint(); break;
    case 'classNext': {
      const cl=getLesson(classCourseId());
      R.classSi=Math.min((cl?cl.sentences.length:1)-1,R.classSi+1); paint(); break;
    }
    case 'classPlay': { const cl=getLesson(classCourseId()); speakText(cl.sentences[R.classSi].en); break; }
    case 'chunkPlay': speakText(t.dataset.t); break;
    case 'classEnter': openCourse(t.dataset.id,0); break;

    /* 单词闯关 */
    case 'gateStart': {
      const lv=parseInt(t.dataset.lv,10), cfg=GATE_LEVELS[lv-1];
      if(!gateUnlocked(cfg,S.gate.stars||{})){ toast('请先通过上一关'); break; }
      R.gate={lv:lv,qs:makeQuestionSet(cfg.n),i:0,pick:null,correct:0,combo:0,best:0,finished:false,results:[]};
      paint(); break;
    }
    case 'gatePick': {
      const g=R.gate,q=g.qs[g.i],i=parseInt(t.dataset.i,10);
      if(g.pick!==null&&g.pick!==undefined) break;
      g.pick=i;
      if(i===q.answer){ g.correct++; g.combo++; g.best=Math.max(g.best,g.combo); S.points+=5; }
      else { g.combo=0; addWeak(q.w,'单词闯关 · 第 '+g.lv+' 关'); srsAdd(q.w); }
      save(); paint(); break;
    }
    case 'gateNext': {
      const g=R.gate;
      g.i++; g.pick=null;
      if(g.i>=g.qs.length){
        g.finished=true;
        const st=starsOf(g.correct/g.qs.length);
        if(st>0){
          if(st>(S.gate.stars[g.lv]||0)) S.gate.stars[g.lv]=st;
          S.gate.best=Math.max(S.gate.best||0,g.correct);
          S.points+=st*10; save();
          toast('通关！获得 '+st+' 星，下一关已解锁');
        }
      }
      paint(); break;
    }
    case 'gateRetry': { const lv=R.gate.lv; R.gate={lv:lv,qs:makeQuestionSet(GATE_LEVELS[lv-1].n),i:0,pick:null,correct:0,combo:0,best:0,finished:false,results:[]}; paint(); break; }
    case 'gateExit': R.gate={lv:1,qs:[],i:0,pick:null,correct:0,combo:0,best:0,finished:false,results:[]}; paint(); break;

    /* 闯关六步：拆解 / 闯关 / 复习 */
    case 'bdSeg': R.breakdownSeg=parseInt(t.dataset.i,10); paint(); break;
    case 'bdPlay': { const bl=getLesson(R.courseId); speakText(bl.sentences[R.breakdownSeg].en); break; }
    case 'bdWords': { const ws=lessonWords(); srsAddMany(ws); toast('已把 '+ws.length+' 个本课生词排进复习'); break; }
    case 'lqPick': {
      const q=R.lessonQuiz,cur=q.qs[q.i],i=parseInt(t.dataset.i,10);
      if(q.pick!==null&&q.pick!==undefined) break;
      q.pick=i;
      if(i===cur.answer){ q.correct++; S.points+=2; }
      else { addWeak(cur.w,'闯关六步 · 本课小测'); srsAdd(cur.w); }
      save(); paint(); break;
    }
    case 'lqNext': {
      const q=R.lessonQuiz; q.i++; q.pick=null;
      if(q.i>=q.qs.length) q.finished=true;
      paint(); break;
    }
    case 'lqRetry': R.lessonQuiz={qs:[],i:0,pick:null,correct:0,best:0,finished:false}; paint(); break;
    case 'qrReveal': stepReview().revealed=true; paint(); break;
    case 'qrGrade': { const rv=stepReview(),w=rv.list[rv.i]; srsGrade(w,parseInt(t.dataset.g,10)); rv.done++; rv.i++; rv.revealed=false; if(rv.i>=rv.list.length) rv.list=[]; paint(); break; }
    case 'qrNext': { const rv=stepReview(); rv.i++; rv.revealed=false; if(rv.i>=rv.list.length) rv.list=[]; paint(); break; }
    case 'qrSeed': {
      const ws=lessonWords(); srsAddMany(ws);
      const rv=stepReview(); rv.list=ws.slice(0,5); rv.i=0; rv.done=0; rv.revealed=false;
      toast('已导入 '+ws.length+' 词，前 5 个进入本步复习'); paint(); break;
    }

    /* 智能复习 */
    case 'rvReveal': R.review.revealed=true; paint(); break;
    case 'rvGrade': {
      const rv=R.review,w=rv.queue[rv.i];
      srsGrade(w,parseInt(t.dataset.g,10));
      rv.done++; rv.i++; rv.revealed=false;
      if(rv.i>=rv.queue.length) rv.queue=[];
      paint(); break;
    }
    case 'rvNext': { const rv=R.review; rv.i++; rv.revealed=false; if(rv.i>=rv.queue.length) rv.queue=[]; paint(); break; }
    case 'rvRefill': R.review={queue:srsDue().slice(0,20),i:0,revealed:false,done:0}; paint(); break;
    case 'rvSeed': { const ws=lessonWords(); srsAddMany(ws); R.review={queue:ws.slice(0,20),i:0,revealed:false,done:0}; toast('已导入 '+ws.length+' 个本课生词'); paint(); break; }
    case 'rvSeedWeak': {
      const ws=S.weak.map(function(x){return x.w;}); srsAddMany(ws);
      R.review={queue:srsDue().slice(0,20),i:0,revealed:false,done:0};
      toast('已把词库 '+ws.length+' 个词纳入复习排期'); paint(); break;
    }

    /* 坦克大战（局部更新，不整页重绘） */
    case 'tankStart': startTank(); break;
    case 'tankPause': {
      const g=R.tankG;
      if(!g.running||g.over){ toast('请先开始游戏'); break; }
      g.paused=!g.paused; updateTankOverlay();
      if(!g.paused){ g.last=performance.now(); toast('继续游戏'); }
      break;
    }
    case 'tankFire': {
      const g=R.tankG;
      if(!g.running||g.paused||g.over||g.locked) break;
      const i=parseInt(t.dataset.i,10),q=g.q,correct=(i===q.answer);
      const enemy=g.enemies.find(function(x){ return x.opt===i&&x.alive; });
      g.locked=true;
      g.bullets.push({sx:348,sy:266,x:348,y:266,
        tx:enemy?enemy.x+22:640,ty:enemy?enemy.y+18:120,
        t:0,correct:correct,opt:i,target:enemy||null});
      const fb=$('#tkFb');
      if(fb){ fb.className='tq-fb '+(correct?'good':'bad');
        fb.textContent=correct?'命中！'+q.w+' = '+q.def:'打偏了 · 正确答案：'+q.opts[q.answer]; }
      document.querySelectorAll('.tank-opt').forEach(function(b){
        b.classList.add('locked');
        if(parseInt(b.dataset.i,10)===q.answer) b.classList.add('correct');
      });
      if(!correct){ g.combo=0; updateTankHUD(); }
      break;
    }
    default: break;
  }
}
