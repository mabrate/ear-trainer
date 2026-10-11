import {PianoEngine} from './piano-engine.js';
export const pianoEngine=new PianoEngine();
const codes=['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK','KeyO','KeyL','KeyP','Semicolon','Quote'];
const bindingLabels={Semicolon:';',Quote:'"'};
export const noteName=midi=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][midi%12]+(Math.floor(midi/12)-1);
export function mountPiano(root,{active=()=>true,compact=false}={}){
 const engine=pianoEngine,$=name=>root.querySelector(`[data-control="${name}"]`);
 root.innerHTML=`<div class="instrument-top"><div><span class="eyebrow">${compact?'REFERENCE PIANO':'THE INSTRUMENT'}</span><h2>Yamaha Upright</h2>${compact?'':'<p>Versilian Community Sample Library</p>'}</div><button data-control="start">Enable piano</button></div><p data-control="status" role="status">Enable the piano to load its local samples.</p><div class="controls"><div class="octave"><button data-control="down" aria-label="Lower octave">−</button><span data-control="range"></span><button data-control="up" aria-label="Higher octave">+</button></div><label>Volume <input data-control="volume" aria-label="Piano volume" type="range" min="0" max="1" step=".01" value=".65"></label><label>Touch <select data-control="velocity"><option value=".45">Soft</option><option value=".75" selected>Medium</option><option value="1">Strong</option></select></label><button data-control="sustain" aria-pressed="false">Sustain <kbd>Space</kbd></button><button data-control="stop">Stop all <kbd>Esc</kbd></button></div><div class="keyboard-scroll"><div class="keyboard" data-control="keyboard" aria-label="Playable piano keys"></div></div><div class="readout"><span data-control="notes">Ready when you are</span><span>A–&quot; · W E T Y U O P · ← / → octave</span></div>`;
 let base=48,latch=false,space=false;const held=new Map(),prefix=crypto.randomUUID();
 function render(){ $('keyboard').replaceChildren();let white=0;for(let i=0;i<codes.length;i++){
  const midi=base+i,black=[1,3,6,8,10].includes(midi%12),key=document.createElement('button');key.className='key '+(black?'black':'white');key.dataset.offset=i;
  if(black)key.style.left=`${white/11*100-3}%`;else white++;
  const binding=bindingLabels[codes[i]]??codes[i].replace('Key','');key.innerHTML=`<span class="pitch">${noteName(midi)}</span><span class="binding">${binding}</span>`;key.setAttribute('aria-label',`${noteName(midi)}, keyboard ${binding}`);
  key.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();key.setPointerCapture(e.pointerId);press('pointer'+e.pointerId,i);};
  key.onpointerup=e=>release('pointer'+e.pointerId);key.onpointercancel=e=>release('pointer'+e.pointerId);key.onlostpointercapture=e=>release('pointer'+e.pointerId);
  // Enter/Space activates a focused key for keyboard-only navigation.
  key.onkeydown=e=>{if(e.code==='Enter'){e.preventDefault();press('enter'+i,i);}};key.onkeyup=e=>{if(e.code==='Enter')release('enter'+i);};key.onblur=()=>release('enter'+i);
  $('keyboard').append(key);
 }$('range').textContent=`${noteName(base)} – ${noteName(base+codes.length-1)}`;$('down').disabled=base<=24;$('up').disabled=base>=72;refresh();}
 function refresh(){for(const key of $('keyboard').children)key.classList.toggle('active',[...held.values()].includes(+key.dataset.offset));$('notes').textContent=held.size?[...new Set([...held.values()].map(i=>noteName(base+i)))].join(' · '):engine.ready?'Play something.':'Ready when you are';}
 function press(id,i){if(!engine.ready||held.has(id))return;held.set(id,i);engine.noteOn(base+i,+$('velocity').value,prefix+id);refresh();}
 function release(id){engine.noteOff(prefix+id);held.delete(id);refresh();}
 function sustain(){engine.setSustain(latch||space);$('sustain').setAttribute('aria-pressed',String(latch||space));}
 function stop(){held.clear();latch=space=false;sustain();engine.stopAll();refresh();}
 function shift(n){stop();base=Math.max(24,Math.min(72,base+n*12));render();}
 $('start').onclick=async()=>{ $('start').disabled=true;try{await engine.load((n,total)=>$('status').textContent=`Loading piano samples… ${n} / ${total}`);$('status').textContent='Piano ready · Local VCSL samples.';$('start').textContent='Piano enabled';refresh();}catch(e){$('status').textContent=`Could not load the piano. ${e.message}. Retry loading.`;$('start').disabled=false;$('start').textContent='Retry loading';}};
 $('volume').oninput=e=>engine.setVolume(+e.target.value);$('sustain').onclick=()=>{latch=!latch;sustain();};$('stop').onclick=stop;$('down').onclick=()=>shift(-1);$('up').onclick=()=>shift(1);
 window.addEventListener('keydown',e=>{if(!active())return;if(e.code==='Escape'){stop();return;}if(e.target.matches('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
  // Space on a button keeps its normal accessible activation behavior.
  if(e.code==='Space'){if(e.target.closest('button,a'))return;e.preventDefault();if(!e.repeat){space=true;sustain();}return;}
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();if(!e.repeat)shift(e.code==='ArrowLeft'?-1:1);return;}
  const i=codes.indexOf(e.code);if(i>=0){e.preventDefault();if(!e.repeat)press(e.code,i);}});
 window.addEventListener('keyup',e=>{if(e.code==='Space'&&space){space=false;sustain();}release(e.code);});window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});render();
 return {stop};
}
