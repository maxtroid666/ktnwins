/* Мягкие низкие звуки: «вуш» на анимациях и глухой «тук» на нажатиях (синтез через Web Audio, без файлов) */
window.SFX=(function(){
  let ctx=null, master=null, noise=null;
  function init(){
    if(ctx) return ctx;
    const C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
    ctx=new C(); master=ctx.createGain(); master.gain.value=.55; master.connect(ctx.destination);
    const len=ctx.sampleRate*2; noise=ctx.createBuffer(1,len,ctx.sampleRate);
    const d=noise.getChannelData(0); let b=0;
    for(let i=0;i<len;i++){ b=(b+.02*(Math.random()*2-1))/1.02; d[i]=b*3.5; } // «коричневый» шум — низкий и мягкий
    return ctx;
  }
  const unlock=()=>{ const c=init(); if(c&&c.state==='suspended') c.resume(); };
  ['pointerdown','keydown','touchstart'].forEach(e=>addEventListener(e,unlock,{passive:true}));
  function whoosh(dur=1.1,vol=.45){
    const c=init(); if(!c) return; const t=c.currentTime;
    const s=c.createBufferSource(); s.buffer=noise;
    const f=c.createBiquadFilter(); f.type='lowpass'; f.Q.value=1.4;
    f.frequency.setValueAtTime(120,t); f.frequency.exponentialRampToValueAtTime(480,t+dur*.45); f.frequency.exponentialRampToValueAtTime(140,t+dur);
    const g=c.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+dur*.42); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t+dur+.05);
  }
  // нажатие: быстрый низкий «вдох» — нарастает и затихает, без щелчка
  function click(vol=.5){
    const c=init(); if(!c) return; const t=c.currentTime;
    const o=c.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(70,t); o.frequency.linearRampToValueAtTime(96,t+.05); o.frequency.exponentialRampToValueAtTime(58,t+.2);
    const g=c.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(vol*.8,t+.045); g.gain.exponentialRampToValueAtTime(.0001,t+.22);
    o.connect(g).connect(master); o.start(t); o.stop(t+.25);
    const n=c.createBufferSource(); n.buffer=noise; const nf=c.createBiquadFilter(); nf.type='lowpass'; nf.frequency.setValueAtTime(140,t); nf.frequency.linearRampToValueAtTime(320,t+.05); nf.frequency.exponentialRampToValueAtTime(120,t+.2);
    const ng=c.createGain(); ng.gain.setValueAtTime(.0001,t); ng.gain.linearRampToValueAtTime(vol*.7,t+.05); ng.gain.exponentialRampToValueAtTime(.0001,t+.22);
    n.connect(nf).connect(ng).connect(master); n.start(t); n.stop(t+.25);
  }
  // финальный аккорд: мягкий низкий пэд (ре минор), когда появляется главная
  function chord(vol=.22){
    const c=init(); if(!c) return; const t=c.currentTime;
    const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(900,t); lp.frequency.exponentialRampToValueAtTime(260,t+3);
    const g=c.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.08); g.gain.exponentialRampToValueAtTime(.0001,t+3.2);
    lp.connect(g).connect(master);
    [73.42,110,146.83,174.61,220].forEach((f,i)=>{
      const o=c.createOscillator(); o.type=i%2?'triangle':'sine'; o.frequency.value=f; o.detune.value=(i-2)*3;
      const og=c.createGain(); og.gain.value=i===0?1:.55; o.connect(og).connect(lp); o.start(t); o.stop(t+3.3);
    });
  }
  return {whoosh,click,chord};
})();
