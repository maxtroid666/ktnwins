/* Интро: сумка → открытие → камера по дуге сверху → погружение внутрь */
(function(){
  const $=s=>document.querySelector(s);
  const intro=$('#intro'), stage=$('.stage'), cam=$('#cam'), scaler=$('#scaler'),
        lid=$('#lid'), hF=$('#hFront'), hB=$('#hBack'), bag=$('#bag');
  const D=200;
  // музыка на полёт в сумку (assets/audio/intro.mp3)
  const mus=new Audio('assets/audio/intro.mp3'); mus.preload='auto';
  // картинки предметов: прячем CSS-рисунок под загруженной картинкой
  document.querySelectorAll('.ph').forEach(img=>{
    const ok=()=>{ img.parentElement.classList.add('has-img'); if(img.closest('.tix')){ const t=document.getElementById('tix2'); if(t) t.style.display='none'; } };
    if(img.complete && img.naturalWidth) ok(); else img.addEventListener('load',ok);
  });

  function fit(){ const s=Math.min(1, innerWidth/600, innerHeight/740); scaler.style.setProperty('--s',s); }
  fit(); addEventListener('resize',fit);

  gsap.set(stage,{perspectiveOrigin:'50% 40%'});
  gsap.set(cam,{rotationX:-17,rotationY:-26});
  gsap.set(lid,{z:-D/2,rotationX:90,transformOrigin:'50% 0%'});
  gsap.set(hF,{z:D/2-12,transformOrigin:'50% 100%'});
  gsap.set(hB,{z:-D/2+12,transformOrigin:'50% 100%'});

  // появление + лёгкое покачивание
  // прозрачность — на .stage, не на 3D-слое: opacity<1 на preserve-3d «сплющивает» сумку до плоской
  gsap.from(scaler,{y:60,duration:1.4,ease:'power3.out'});
  gsap.from(stage,{opacity:0,duration:1.4,ease:'power2.out'});
  gsap.from(['.intro-top','.intro-bottom','#openBtn'],{opacity:0,y:12,duration:1,delay:.5,stagger:.12});
  const idle=gsap.to(cam,{rotationY:-12,rotationX:-21,duration:3.2,ease:'sine.inOut',yoyo:true,repeat:-1});

  let opened=false;
  function open(){
    if(opened) return; opened=true; idle.kill();
    const tl=gsap.timeline({onComplete:enter});
    try{ mus.currentTime=0; mus.volume=.68; mus.play().catch(()=>{}); }catch(e){}
    tl.to(['#openBtn','.intro-top','.intro-bottom'],{autoAlpha:0,duration:.4},0)
      .to(hF,{rotationX:-100,duration:.8,ease:'power2.inOut'},.1)
      .to(hB,{rotationX:100,duration:.8,ease:'power2.inOut'},.1)
      // камера уходит по дуге наверх
      .to(cam,{rotationX:-40,rotationY:22,duration:1.4,ease:'power2.inOut'},.15)
      // крышка открывается
      .to(lid,{rotationX:208,duration:1.6,ease:'power3.inOut'},.75)
      // смотрим сверху внутрь
      .to(cam,{rotationX:-84,rotationY:0,duration:1.5,ease:'power2.inOut'},1.55)
      .to(stage,{perspectiveOrigin:'50% 54%',duration:1.5,ease:'power2.inOut'},1.55)
      // погружение
      .to(cam,{z:1480,duration:1.25,ease:'power3.in'},2.85)
      .call(show,null,3.5)
      .to(intro,{autoAlpha:0,duration:.7,ease:'power1.inOut'},3.55);
  }
  // сайт включается ПОД интро (интро ещё непрозрачно), затем интро плавно растворяется — без вспышки
  let shown=false;
  function show(){ if(shown) return; shown=true; window.SFX&&SFX.chord&&SFX.chord(); gsap.set('#site',{opacity:1}); window.dispatchEvent(new Event('site:show')); }
  function enter(){
    intro.style.display='none';
    document.body.classList.remove('locked');
    gsap.set('#site',{opacity:1});
    window.dispatchEvent(new Event('site:enter'));
  }
  bag.addEventListener('click',open);
  $('#openBtn').addEventListener('click',open);
  $('#skip').addEventListener('click',()=>{ opened=true; gsap.killTweensOf('*'); gsap.to(mus,{volume:0,duration:.4,onComplete:()=>mus.pause()}); show(); gsap.to(intro,{autoAlpha:0,duration:.5,onComplete:enter}); });
  addEventListener('keydown',e=>{ if(!opened && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); open(); } });
})();
