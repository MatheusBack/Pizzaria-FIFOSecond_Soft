const FACES=['😀','😎','🤠','🥳','😋','🤓','👩‍🦰','👨‍🦳','🧑‍🎤','👵','🧔','👧'];
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let S; let speed=1, auto=false, busy=false, sound=true, ac;

function beep(f,d=.12,t='sine'){ if(!sound)return; try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(.12,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+d);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+d);}catch(e){} }
const sfx={hit:()=>{beep(880,.1);setTimeout(()=>beep(1320,.2),90)},tick:()=>beep(300,.08,'square'),chance:()=>beep(520,.15,'triangle'),out:()=>beep(180,.3,'sawtooth'),sit:()=>beep(660,.15)};

function parse(){return $('seq').value.split(/[\s,;]+/).map(s=>s.trim().toUpperCase()).filter(Boolean).slice(0,60)}
function init(){
  const n=+$('nSel').value;
  S={n,seq:parse(),i:0,frames:Array(n).fill(null),ptr:0,hit:0,fault:0,req:0};
  $('logs').innerHTML='';$('report').classList.remove('show');
  drawChairs();drawProg();stats();moveChef(false);
  say('Pronto! '+S.seq.length+' eventos na fila. Todas as '+n+' cadeiras estão livres.');
}
function drawChairs(){
  $('chairs').innerHTML=S.frames.map((f,i)=>`<div class="chair" id="ch${i}"><div class="no">Cadeira ${i+1}</div>${
    f?`<div class="client"><div class="face">${faceOf(f.c)}</div><div class="name">${f.c} <span class="pizza">🍕</span></div><div class="seal ${f.r?'on':'off'}" id="se${i}">${f.r?'⭐ R=1':'R=0'}</div></div>`
      :`<div class="free">livre</div>`}</div>`).join('');
}
function faceOf(c){let h=0;for(const k of c)h=(h*31+k.charCodeAt(0))%997;return FACES[h%FACES.length]}
function drawProg(){
  $('prog').innerHTML=S.seq.map((t,i)=>`<span class="chip ${t[0]=='-'?'bill':''} ${i<S.i?'done':''} ${i==S.i?'now':''}">${t}</span>`).join('');
}
function stats(){
  $('sReq').textContent=S.req;$('sHit').textContent=S.hit;$('sFault').textContent=S.fault;
  $('sEff').textContent=S.req?Math.round(S.hit/S.req*100)+'%':'–';
}
function moveChef(hop=true){
  const c=$('ch'+S.ptr),row=$('chairs');if(!c)return;
  const ch=$('chef');ch.style.left=(c.offsetLeft+c.offsetWidth/2)+'px';
  if(hop){ch.classList.remove('hop');void ch.offsetWidth;ch.classList.add('hop')}
}
function say(t){$('say').innerHTML=t}
function log(t,cls){const d=document.createElement('div');d.className=cls;d.innerHTML=t;$('logs').prepend(d)}
const wait=m=>sleep(m/speed);

async function step(){
  if(busy||S.i>=S.seq.length)return;
  busy=true;btns();
  const tok=S.seq[S.i];drawProg();
  if(tok[0]=='-'||tok[0]=='!') await bill(tok.slice(1));
  else await request(tok);
  S.i++;drawProg();stats();
  if(S.i>=S.seq.length) finish();
  busy=false;btns();
}
async function bill(c){
  const i=S.frames.findIndex(f=>f&&f.c==c);
  if(i<0){say(`<b>${c}</b> pediu a conta, mas nem estava sentado.`);log(`🧾 ${c} pediu a conta, mas não estava no balcão.`,'bill');await wait(900);return}
  say(`🧾 <b>${c}</b> pediu a conta e levantou. A cadeira ${i+1} ficou livre na hora.`);
  const el=document.querySelector(`#ch${i} .client`);el&&el.classList.add('out');sfx.out();await wait(600);
  S.frames[i]=null;drawChairs();log(`🧾 ${c} pagou e liberou a cadeira ${i+1}.`,'bill');await wait(500);
}
async function request(c){
  S.req++;stats();
  const i=S.frames.findIndex(f=>f&&f.c==c);
  if(i>=0){
    S.hit++;S.frames[i].r=1;
    $('ch'+i).classList.add('look');sfx.hit();
    say(`✅ <b>${c}</b> já está na cadeira ${i+1} e pediu outra fatia. O selo acende (R=1) e o chef nem sai do lugar.`);
    const se=$('se'+i);se.className='seal on drop';se.textContent='⭐ R=1';
    const cl=document.querySelector(`#ch${i} .client`);cl.insertAdjacentHTML('afterbegin','<div class="tag">Hit!</div>');
    log(`✅ <b>${c}</b>: hit. R vira 1 na cadeira ${i+1}.`,'hit');
    await wait(1100);$('ch'+i).classList.remove('look');drawChairs();return;
  }
  S.fault++;stats();
  const free=S.frames.findIndex(f=>!f);
  if(free>=0){
    say(`🪑 <b>${c}</b> chegou e a cadeira ${free+1} está livre. Ele senta com R=0 e ninguém precisa sair.`);
    S.frames[free]={c,r:0};sfx.sit();drawChairs();
    log(`🪑 <b>${c}</b>: falta, mas havia cadeira ${free+1} livre.`,'fault');await wait(1100);return;
  }
  say(`🚪 <b>${c}</b> chegou e não há cadeira livre. O chef vai procurar uma vítima.`);
  log(`🚪 <b>${c}</b>: falta. Balcão cheio, o chef entra em ação.`,'fault');
  await wait(900);
  while(true){
    moveChef();const el=$('ch'+S.ptr);el.classList.add('look');sfx.tick();
    const f=S.frames[S.ptr];
    await wait(800);
    if(f.r){
      say(`⭐ Cadeira ${S.ptr+1}: <b>${f.c}</b> tem R=1. Ganhou uma segunda chance! O selo apaga (R=0) e o chef segue em frente.`);
      f.r=0;const se=$('se'+S.ptr);se.className='seal off drop';se.textContent='R=0';sfx.chance();
      log(`⭐ Cadeira ${S.ptr+1}: ${f.c} tinha R=1. Vira R=0 e se salva.`,'sec');
      await wait(1100);el.classList.remove('look');S.ptr=(S.ptr+1)%S.n;
    }else{
      say(`💥 Cadeira ${S.ptr+1}: <b>${f.c}</b> tem R=0. É a vítima! Ele levanta e <b>${c}</b> senta com R=0.`);
      el.classList.add('victim');sfx.out();
      log(`💥 Cadeira ${S.ptr+1}: ${f.c} saiu. <b>${c}</b> entrou com R=0.`,'fault');
      await wait(900);
      const old=el.querySelector('.client');old&&old.classList.add('out');await wait(450);
      S.frames[S.ptr]={c,r:0};drawChairs();sfx.sit();
      const next=(S.ptr+1)%S.n;S.ptr=next;await wait(500);
      $('ch'+S.ptr);moveChef();await wait(500);return;
    }
  }
}
function finish(){
  const r=S.req,e=r?Math.round(S.hit/r*100):0;
  $('rReq').textContent=r;$('rHit').textContent=S.hit;$('rFault').textContent=S.fault;$('rEff').textContent=e+'%';
  $('report').classList.add('show');$('rBar').style.width='0';setTimeout(()=>$('rBar').style.width=e+'%',60);
  say('🎉 Sequência concluída! Veja o relatório do dia logo abaixo.');auto=false;btns();
  $('report').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function btns(){
  const end=S.i>=S.seq.length;
  $('bStep').disabled=busy||end||!S.seq.length;
  $('bAuto').disabled=end||!S.seq.length;
  $('bAuto').textContent=auto?'⏸ Pausar':'⏩ Auto play';
}
async function loop(){
  while(auto&&S.i<S.seq.length){await step();await wait(500)}
  auto=false;btns();
}
$('bStep').onclick=step;
$('bAuto').onclick=()=>{auto=!auto;btns();if(auto&&!busy)loop()};
$('bReset').onclick=()=>{auto=false;setTimeout(()=>{busy=false;init();btns()},50)};
$('bLoad').onclick=$('bReset').onclick;
$('nSel').onchange=$('bReset').onclick;
$('seq').addEventListener('keydown',e=>{if(e.key==='Enter')$('bLoad').click()});
$('bSnd').onclick=e=>{sound=!sound;e.currentTarget.textContent=sound?'🔊 Som':'🔇 Mudo';e.currentTarget.setAttribute('aria-pressed',sound)};
document.querySelectorAll('.speed button[data-s]').forEach(b=>b.onclick=()=>{
  speed=+b.dataset.s;document.querySelectorAll('.speed button[data-s]').forEach(x=>x.classList.toggle('on',x===b));
});
addEventListener('resize',()=>moveChef(false));
init();btns();
