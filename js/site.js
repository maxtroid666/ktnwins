/* KTNWINS — главная: поле с предметами. Клик по предмету — поле уезжает, предмет встаёт на место, прилетает инфографика. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const hero=$('.hero'), nav=$('#nav'), bg=$('.hero-bg'), title=$('.hero-title'), back=$('#backBtn'), mq=$('.marquee');
  const fine=matchMedia('(pointer:fine)').matches, mob=()=>innerWidth<=760;
  const PH=window.PHOTOS||[], TR=window.TRACKS||[], VD=window.VIDEOS||[];
  const pad=n=>String(n).padStart(2,'0');
  const toSec=s=>{const p=String(s).split(':').map(Number);return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+(p[1]||0)};
  const fmt=t=>{t=Math.max(0,Math.floor(t));const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return (h?h+':'+pad(m):m)+':'+pad(s)};
  const wraps=$$('.it-wrap');
  const wrapOf=n=>{const b=$(`.it-wrap .item[data-open="${n}"]`);return b&&b.closest('.it-wrap')};

  const menuBtn=$('#menuBtn');
  menuBtn.addEventListener('click',()=>menuBtn.setAttribute('aria-expanded',nav.classList.toggle('open')));

  /* ---------- параллакс (только поле и предметы, надпись закреплена) ---------- */
  let live=true;
  function parallax(){
    if(!fine) return;
    const L=wraps.map(w=>({el:w,d:+w.dataset.depth||1,k:16,j:11}));
    L.push({el:bg,d:1,k:8,j:6});
    const eb=$('.earbuds'), mw=wrapOf('music'); if(eb&&mw) L.push({el:eb,d:+mw.dataset.depth||1,k:16,j:11}); // провод двигается вместе с плеером
    let tx=0,ty=0,cx=0,cy=0;
    hero.addEventListener('mousemove',e=>{ tx=e.clientX/innerWidth-.5; ty=e.clientY/innerHeight-.5; });
    hero.addEventListener('mouseleave',()=>{ tx=0; ty=0; });
    (function loop(){
      cx+=(tx-cx)*.025; cy+=(ty-cy)*.025;
      L.forEach(o=>o.el.style.translate=(-cx*o.k*o.d).toFixed(2)+'px '+(-cy*o.j*o.d).toFixed(2)+'px');
      requestAnimationFrame(loop);
    })();
  }
  function miniScreen(){
    const el=$('#miniCyc'); if(!el||!TR.length) return;
    el.innerHTML=TR.slice(0,3).map((t,i)=>`<div class="ln">${pad(i+1)} ${t.title}</div>`).join('');
    const ls=[...el.querySelectorAll('.ln')]; let i=0;
    const tick=()=>{ls.forEach((l,k)=>l.classList.toggle('on',k===i)); i=(i+1)%ls.length};
    tick(); setInterval(tick,2200);
  }
  if(getComputedStyle(document.documentElement).getPropertyValue('--sign').trim()) $$('.sign').forEach(s=>s.style.display='block');

  // появление главной идёт, пока растворяется интро: поле «доезжает» из зума без исчезновений
  addEventListener('site:show',()=>{
    document.documentElement.classList.add('site-on');
    gsap.from('.hero-bg',{scale:1.14,duration:1.6,ease:'power3.out'});
    gsap.from('.float',{scale:1.25,duration:1.4,stagger:.03,ease:'power3.out',clearProps:'transform'});
    gsap.from('.hero-title .k',{y:40,opacity:0,duration:1.1,delay:.25,ease:'power4.out'});
    gsap.from('.hero-title .sub,.hero-title .scr',{y:14,opacity:0,duration:.9,delay:.45,stagger:.1});
    gsap.from('nav.top,.marquee',{opacity:0,duration:.8,delay:.6});
    miniScreen();
  },{once:true});
  addEventListener('site:enter',()=>{ document.documentElement.classList.add('site-on'); parallax(); },{once:true});

  /* ---------- переход: поле уезжает, предмет встаёт на место ---------- */
  // цель для центра предмета (в % экрана) и масштаб
  const CFG={bio:[80,60,2.1],rider:[50,45,1.2],video:[20,58,1.3],dates:[57,40,1.2],booking:[51,40,1.7],photos:[50,63,1.25]};
  const MOB={bio:[50,27,1.3],rider:[50,26,.75],video:[50,26,.8],dates:[50,26,.8],booking:[50,26,.9],photos:[50,26,.75]};
  let state=null, tl=null, busy=false, later=null;
  const onOpen={}, onClose={};

  /* даты / райдер / букинг: предмет и текст — одна группа, ровно по центру страницы и по одной оси */
  const SIDE={dates:'right',rider:'right',booking:'left'}, PW={dates:[.42,620],rider:[.36,540],booking:[.3,460]};
  function sideLayout(name,panel,r){
    const W=innerWidth,H=innerHeight, pr=$('#panels').getBoundingClientRect(), trc=title.getBoundingClientRect();
    const top=trc.top-H*.075+trc.height*.56+H*.04, bot=H*.95, av=bot-top, yc=top+av/2;
    const pw=Math.min(W*PW[name][0],PW[name][1]), gap=Math.max(36,W*.035);
    panel.style.cssText=`left:0;top:0;right:auto;bottom:auto;width:${pw}px;height:auto;max-height:${av}px`;
    const ph=panel.offsetHeight;
    let sc=CFG[name][2], iw=r.width*1.06*sc, ih=r.height*1.06*sc;
    const f=Math.min(1,av*.9/ih,(W*.9-gap-pw)/iw); sc*=f; iw*=f;
    const x0=(W-(iw+gap+pw))/2;
    const tx=SIDE[name]==='right'?x0+iw/2:x0+pw+gap+iw/2, pl=SIDE[name]==='right'?x0+iw+gap:x0;
    panel.style.left=(pl-pr.left)+'px'; panel.style.top=(Math.max(top,yc-ph/2)-pr.top)+'px';
    return {tx,ty:yc,sc};
  }
  function open(name){
    if(busy||state===name) return;
    if(state){ close(()=>open(name)); return; }
    const panel=$(`.panel[data-panel="${name}"]`), wrap=wrapOf(name); if(!panel||!wrap) return;
    busy=true; state=name; live=false; nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false');
    wraps.forEach(w=>w.inert=w!==wrap); // улетевшие предметы не ловят Tab
    gsap.killTweensOf([...wraps,bg]);
    const W=innerWidth,H=innerHeight;
    panel.classList.add('on'); gsap.set(panel,{autoAlpha:0,x:0,y:0}); hero.classList.toggle('mus',name==='music');
    const r=wrap.getBoundingClientRect(), pt=(wrap.style.translate||'0px 0px').split(' ').map(parseFloat);
    const cx=r.left+r.width/2-(pt[0]||0), cy=r.top+r.height/2-(pt[1]||0); // без параллакса: дальше он добавится и к предмету, и к проводу одинаково
    let tx,ty,sc,rot=0,st=null;
    if(name==='music'){
      st=panel.querySelector('.pl-stage').getBoundingClientRect();
      tx=st.left+st.width*(.0014+.2801/2); ty=st.top+st.height*(.2284+.7623/2);
      sc=st.height*.7623/(wrap.offsetHeight*.962); rot=14.2; // корпус на картинке ~96% высоты кадра mp3 (наклон 5°)
    } else if(SIDE[name]&&!mob()){ const g=sideLayout(name,panel,r); tx=g.tx; ty=g.ty; sc=g.sc;
    } else { if(SIDE[name]) panel.style.cssText=''; const c=(mob()?MOB:CFG)[name]; tx=c[0]/100*W; ty=c[1]/100*H; sc=c[2]; }
    const dx=tx-cx, dy=ty-cy;
    hero.classList.add('detail'); window.SFX&&SFX.whoosh(1.25,.45);
    tl=gsap.timeline({defaults:{duration:1.15,ease:'power3.inOut'},onComplete:()=>{busy=false; onOpen[name+'Done']&&onOpen[name+'Done'](panel,{x:tx,y:ty})}});
    tl.to(bg,{x:gsap.getProperty(bg,'x')+dx,y:gsap.getProperty(bg,'y')+dy},0);
    if(st){ const eb=$('.earbuds'); gsap.set(eb,{left:st.left,top:st.top,width:st.width,height:st.height}); tl.fromTo(eb,{autoAlpha:0},{autoAlpha:1,duration:.5,ease:'power2.out'},.85); }
    /* остальные предметы расходятся по лучам ОТ выбранного (гомотетия): расстояния между всеми только растут, никто не касается */
    const others=wraps.filter(w=>w!==wrap).map(w=>{ const b=w.getBoundingClientRect(); return {w,b,vx:b.left+b.width/2-cx,vy:b.top+b.height/2-cy}; });
    let f=1.6;
    others.forEach(o=>{
      const hw=o.b.width/2+60, hh=o.b.height/2+60, c=[];
      if(o.vx>1) c.push((W+hw-tx)/o.vx); else if(o.vx<-1) c.push((tx+hw)/-o.vx);
      if(o.vy>1) c.push((H+hh-ty)/o.vy); else if(o.vy<-1) c.push((ty+hh)/-o.vy);
      if(c.length) f=Math.max(f,Math.min(...c));
    });
    f=Math.min(f,14);
    tl.to(wrap,{x:gsap.getProperty(wrap,'x')+dx,y:gsap.getProperty(wrap,'y')+dy,scale:sc,rotation:rot},0);
    others.forEach(o=>tl.to(o.w,{x:gsap.getProperty(o.w,'x')+dx+o.vx*(f-1),y:gsap.getProperty(o.w,'y')+dy+o.vy*(f-1)},0));
    tl.to(title,{scale:mob()?.62:.56,y:-H*(mob()?.04:.075),duration:.9},.1)
      .to(mq,{yPercent:115,duration:.6},0)
      .to(back,{autoAlpha:1,duration:.4},.7)
      .fromTo(panel,{autoAlpha:0,x:-dx*.35,y:-dy*.35},{autoAlpha:1,x:0,y:0,duration:.8,ease:'power3.out'},.6);
    onOpen[name]&&onOpen[name](panel,{x:tx,y:ty});
  }
  function close(cb){
    if(!tl||busy) return;
    busy=true; const name=state;
    if(later){ later.kill(); later=null; }
    onClose[name]&&onClose[name](); window.SFX&&SFX.whoosh(1,.38);
    tl.eventCallback('onReverseComplete',()=>{
      const p=$(`.panel[data-panel="${name}"]`); p.classList.remove('on');
      hero.classList.remove('detail','mus'); state=null; tl=null; busy=false; live=true; wraps.forEach(w=>w.inert=false);
      if(cb) cb();
    });
    tl.timeScale(1.35).reverse();
  }
  $$('[data-open]').forEach(b=>b.addEventListener('click',e=>{ if(e.target.closest('[data-act],.ln')) return; window.SFX&&SFX.click(); const n=b.dataset.open; if(state===n&&b.classList.contains('item')) close(); else open(n); }));
  back.addEventListener('click',()=>{ window.SFX&&SFX.click(); close(); });
  addEventListener('keydown',e=>{ if(e.key==='Escape') close(); });

  /* букинг: телефон поднимается к надписи — на десктопе подстрочники уступают ему место */

  /* кто она: числа набегают */
  onOpen.bio=p=>{
    const img=$('#bioImg'); if(img&&!img.src&&PH[0]) img.src=PH[0].src;
    p.querySelectorAll('[data-count]').forEach(b=>{
      const to=+b.dataset.count, from=+(b.dataset.from||0), suf=b.dataset.suf||'', o={v:from};
      b.textContent=from+suf;
      gsap.to(o,{v:to,duration:1.6,delay:1,ease:'power2.out',onUpdate:()=>b.textContent=Math.round(o.v)+suf});
    });
  };

  /* фото: полароиды высыпаются из постера */
  const pile=$('#pile'); let pols=[], topZ=10, active=null;
  const words=['♡','set','backstage','moscow','one night','♡','higher','crew','sound','♡','night','friends'];
  function buildPile(){
    const list=PH.length?PH:Array.from({length:8},()=>({src:''}));
    pile.innerHTML=list.map((p,i)=>`<button class="pol" aria-label="Фото ${i+1}"><img src="${p.src}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span>${pad(i+1)} ${words[i%words.length]}</span></button>`).join('');
    pols=[...pile.querySelectorAll('.pol')];
    pols.forEach(p=>p.addEventListener('click',()=>{ window.SFX&&SFX.click(.35); front(p); }));
  }
  function front(p){
    if(active&&active!==p){ active.classList.remove('top'); gsap.to(active,{scale:1,rotation:+active.dataset.rot,duration:.45,ease:'power2.out'}); }
    active=p; p.classList.add('top'); p.style.zIndex=++topZ;
    const W=pile.clientWidth,H=pile.clientHeight,pw=p.offsetWidth,ph=p.offsetHeight;
    const x=gsap.utils.clamp(pw*.12,W-pw*1.18,+gsap.getProperty(p,'x')), y=gsap.utils.clamp(ph*.12,H-ph*1.18,+gsap.getProperty(p,'y'));
    gsap.to(p,{x,y,scale:1.12,rotation:gsap.utils.random(-3,3),duration:.5,ease:'back.out(1.6)'});
  }
  const SLOTS=[[.02,.05],[.17,.44],[.01,.58],[.67,.03],[.83,.34],[.69,.58],[.25,.02]];
  const rs=$('#reshuffle'); let pO=null, lastPick=[], reBusy=false;
  function pickPhotos(){ // каждый раз другие 7 фото в случайном порядке
    const pool=PH.filter(p=>!lastPick.includes(p.src)), src=pool.length>=7?pool:PH.slice();
    const pick=gsap.utils.shuffle(src.slice()).slice(0,7); lastPick=pick.map(p=>p.src); return pick;
  }
  function pGeom(){
    const W=pile.clientWidth,H=pile.clientHeight,pw=Math.round(gsap.utils.clamp(120,240,Math.min(W*.16,(H-60)/1.6)));
    const ph=pw/.9+45, pr=pile.getBoundingClientRect();
    return {W,H,pw,ph,ox:pO.x-pr.left-pw/2,oy:pO.y-pr.top-ph/2};
  }
  function scatter(){
    const pick=pickPhotos();
    pile.innerHTML=pick.map((p,i)=>`<button class="pol" aria-label="Фото"><img src="${p.src}" alt="" onerror="this.style.visibility='hidden'"><span>${words[gsap.utils.random(0,words.length-1,1)]}</span></button>`).join('');
    pols=[...pile.querySelectorAll('.pol')];
    pols.forEach(p=>p.addEventListener('click',()=>{ window.SFX&&SFX.click(.35); front(p); }));
    const {W,H,pw,ph,ox,oy}=pGeom(); pile.style.setProperty('--pw',pw+'px');
    active=null; topZ=10;
    const sl=gsap.utils.shuffle(SLOTS.slice()); // раскладка по слотам вокруг постера + случайные отклонения
    pols.forEach((p,i)=>{
      const rot=gsap.utils.random(-16,16); p.dataset.rot=rot; p.style.zIndex=++topZ;
      const m=pw*.2, x=gsap.utils.clamp(m,W-pw-m,(sl[i][0]+gsap.utils.random(-.04,.04))*W), y=gsap.utils.clamp(m,H-ph-m,(sl[i][1]+gsap.utils.random(-.04,.04))*H);
      gsap.fromTo(p,{x:ox,y:oy,rotation:0,scale:.35,opacity:0},{x,y,rotation:rot,scale:1,opacity:1,duration:gsap.utils.random(.8,1.1),delay:i*.06,ease:'power3.out'});
      gsap.delayedCall(i*.06,()=>window.SFX&&SFX.whoosh(.5,.12));
    });
  }
  function placeRs(panel){ // кнопка «обновить» — над постером
    const w=wrapOf('photos'), h=w.offsetHeight*(mob()?MOB:CFG).photos[2], pr=panel.getBoundingClientRect();
    gsap.set(rs,{left:pO.x-pr.left-rs.offsetWidth/2,top:pO.y-h/2-pr.top-rs.offsetHeight-22});
    gsap.fromTo(rs,{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:.5,ease:'power3.out'});
  }
  onOpen.photos=(panel,o)=>{
    pO=o; pile.innerHTML=''; pols=[]; gsap.set(rs,{autoAlpha:0});
    later=gsap.delayedCall(.95,()=>{ later=null; scatter(); placeRs(panel); });
  };
  rs.addEventListener('click',()=>{
    if(reBusy||!pols.length) return; reBusy=true; window.SFX&&SFX.click(.45);
    gsap.fromTo(rs.querySelector('svg'),{rotation:0},{rotation:360,duration:.9,ease:'power2.inOut'});
    const {ox,oy}=pGeom(); window.SFX&&SFX.whoosh(.6,.2);
    gsap.to(pols,{x:ox,y:oy,rotation:0,scale:.35,opacity:0,duration:.45,stagger:.03,ease:'power2.in'});
    gsap.delayedCall(.45+.03*pols.length,()=>{ scatter(); reBusy=false; });
  });
  onClose.photos=()=>{ gsap.to(pols,{opacity:0,scale:.6,duration:.3,stagger:.01}); gsap.to(rs,{autoAlpha:0,duration:.2}); };

  /* видео: 6 роликов, клик — плеер раскрывается на весь блок */
  const vg=$('#vgrid'), vb=$('#vbig'); let vCur=null, vList=[];
  function vBuild(){
    vList=VD.length?VD.slice(0,6):Array.from({length:6},(_,i)=>({title:'video '+(i+1),url:'#'}));
    vg.innerHTML=vList.map((v,i)=>{const p=PH.length?PH[(i+6)%PH.length].src:'';
      return `<button class="vc" data-i="${i}" style="--r:${gsap.utils.random(-2.5,2.5).toFixed(1)}deg"><img src="${p}" alt="" loading="lazy"><i class="play"></i><span>${v.title}</span></button>`}).join('');
    vg.querySelectorAll('.vc').forEach(c=>c.addEventListener('click',()=>vOpen(c)));
  }
  function vRect(c){ const a=c.querySelector('img').getBoundingClientRect(), b=vb.getBoundingClientRect();
    return {x:a.left-b.left,y:a.top-b.top,scaleX:a.width/b.width,scaleY:a.height/b.height}; }
  function vOpen(c){
    if(vCur) return; vCur=c; window.SFX&&SFX.click(); window.SFX&&SFX.whoosh(.8,.3);
    const v=vList[+c.dataset.i]; $('#vbImg').src=c.querySelector('img').src; $('#vbTitle').textContent=v.title;
    vb.classList.add('on');
    gsap.fromTo(vb,{...vRect(c),transformOrigin:'0 0',borderRadius:10},{x:0,y:0,scaleX:1,scaleY:1,borderRadius:16,duration:.75,ease:'power3.inOut'});
    gsap.fromTo(vb.querySelectorAll('.vplay,.vcap,.vclose'),{opacity:0},{opacity:1,duration:.4,delay:.5});
    gsap.to(vg.querySelectorAll('.vc'),{opacity:0,scale:.85,y:30,duration:.45,stagger:.03,ease:'power2.in'});
  }
  function vClose(instant){
    if(!vCur) return; const c=vCur; vCur=null;
    if(instant){ vb.classList.remove('on'); gsap.set(vg.querySelectorAll('.vc'),{clearProps:'opacity,scale,y'}); return; }
    window.SFX&&SFX.whoosh(.7,.25);
    gsap.to(vb.querySelectorAll('.vplay,.vcap,.vclose'),{opacity:0,duration:.2});
    gsap.to(vg.querySelectorAll('.vc'),{opacity:1,scale:1,y:0,duration:.55,delay:.25,stagger:.03,ease:'power3.out',clearProps:'opacity,scale,y'});
    gsap.to(vb,{...vRect(c),duration:.65,ease:'power3.inOut',onComplete:()=>vb.classList.remove('on')});
  }
  onOpen.video=()=>{ if(!vg.children.length) vBuild(); vClose(true); };
  onClose.video=()=>{ if(vCur) gsap.to(vb,{opacity:0,duration:.3,onComplete:()=>{vClose(true);gsap.set(vb,{opacity:1})}}); };
  $('#vclose').addEventListener('click',()=>{ window.SFX&&SFX.click(); vClose(); });
  $('#vplay').addEventListener('click',()=>{
    window.SFX&&SFX.click(); const v=vCur&&vList[+vCur.dataset.i];
    if(v&&v.url&&v.url!=='#') window.open(v.url,'_blank'); else gsap.fromTo('#vplay',{x:-8},{x:0,duration:.6,ease:'elastic.out(1,.3)'});
  });

  /* ---------- миксы: плеер ---------- */
  const plList=$('#plList'), info=$('#plInfo'), pl=$('#pl');
  let sel=0, curT=0, playing=false, pos=0, tmr=null, audio=null;
  const lens=TR.map(t=>toSec(t.len));
  if(plList) plList.innerHTML=TR.map((t,i)=>`<div class="ln" data-i="${i}">${pad(i+1)} ${t.title}</div>`).join('');
  const rows=()=>[...plList.querySelectorAll('.ln')];
  function fillInfo(){
    const t=TR[sel]; if(!t) return;
    $('#iNo').textContent=pad(sel+1)+' / '+pad(TR.length);
    $('#iTtl').textContent=t.title; $('#iLen').textContent=t.len; $('#iDesc').textContent=t.desc||'';
    const a=$('#iLnk'); a.href=t.url||'#'; a.style.display=(t.url&&t.url!=='#')?'':'none';
  }
  function render(){
    rows().forEach((r,i)=>{r.classList.toggle('on',i===sel); r.innerHTML=(i===curT&&playing?'▶ ':'')+pad(i+1)+' '+TR[i].title});
    const len=lens[curT]||1, pct=Math.min(100,pos/len*100);
    $('#ctBar').style.width=pct+'%'; $('#ctT').textContent=fmt(pos)+' / '+TR[curT].len;
    pl.classList.toggle('playing',playing&&sel===curT);
    $('#ppBtn').innerHTML=playing?'<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>':'<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>';
  }
  function setSel(i){
    i=(i+TR.length)%TR.length; if(i===sel) return; const dir=i>sel?1:-1; sel=i;
    gsap.timeline().to(info,{y:dir*-14,opacity:0,duration:.18,ease:'power2.in'}).add(fillInfo).fromTo(info,{y:dir*14},{y:0,opacity:1,duration:.3,ease:'power3.out'});
    render();
  }
  function stopT(){ clearInterval(tmr); tmr=null; if(audio) audio.pause(); }
  function startT(){
    stopT(); const t=TR[curT];
    if(t.audio){ if(!audio){ audio=new Audio(); audio.addEventListener('timeupdate',()=>{pos=audio.currentTime;render()}); audio.addEventListener('ended',()=>next(true)); }
      if(!audio.src.endsWith(t.audio)){ audio.src=t.audio; audio.currentTime=pos; } audio.play().catch(()=>{}); }
    else tmr=setInterval(()=>{ pos++; if(pos>=lens[curT]) next(true); render(); },1000);
  }
  function play(){
    if(sel!==curT){ curT=sel; pos=0; if(audio) audio.removeAttribute('src'); }
    playing=!playing; playing?startT():stopT(); render();
  }
  function next(auto,dir=1){ setSel(sel+dir); if(playing||auto){ curT=sel; pos=0; if(audio) audio.removeAttribute('src'); playing=true; startT(); } render(); }
  const act={play,prev:()=>next(false,-1),next:()=>next(false,1),up:()=>setSel(sel-1),down:()=>setSel(sel+1)};
  $$('[data-act]').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); window.SFX&&SFX.click(.45); act[b.dataset.act](); if(b.classList.contains('hot')){b.classList.add('flash');setTimeout(()=>b.classList.remove('flash'),160)} }));
  if(plList) plList.addEventListener('click',e=>{e.stopPropagation(); const r=e.target.closest('.ln'); if(r){ window.SFX&&SFX.click(.35); setSel(+r.dataset.i);} });
  $('#ctProg').addEventListener('click',e=>{ const r=e.currentTarget.getBoundingClientRect(); pos=(e.clientX-r.left)/r.width*(lens[curT]||0); if(audio&&TR[curT].audio) audio.currentTime=pos; render(); });
  addEventListener('keydown',e=>{
    if(state!=='music') return;
    const k={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'prev',ArrowRight:'next',Enter:'play',' ':'play'}[e.key];
    if(k){ e.preventDefault(); act[k](); }
  });
  onClose.music=()=>{ if(playing){ playing=false; stopT(); render(); } };
  if(TR.length){ fillInfo(); render(); }
})();
