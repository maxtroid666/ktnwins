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
  function click(vol=.5){
    const c=init(); if(!c) return; const t=c.currentTime;
    const o=c.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(130,t); o.frequency.exponentialRampToValueAtTime(52,t+.12);
    const g=c.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+.17);
    o.connect(g).connect(master); o.start(t); o.stop(t+.2);
    const n=c.createBufferSource(); n.buffer=noise; const nf=c.createBiquadFilter(); nf.type='lowpass'; nf.frequency.value=260;
    const ng=c.createGain(); ng.gain.setValueAtTime(vol*.6,t); ng.gain.exponentialRampToValueAtTime(.0001,t+.06);
    n.connect(nf).connect(ng).connect(master); n.start(t); n.stop(t+.07);
  }
  return {whoosh,click};
})();
