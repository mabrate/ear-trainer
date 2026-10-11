import {keySignature,keyAccidental} from '../melodic-dictation/music.js';
import {makeMeasure,refreshSlot,positionAt,beamGroups,readingPitches,rhythmSymbol} from './music.js';
import {noteName} from '../app.js';
const $=id=>document.getElementById(id),svg=$('music');
let measures=[],groups=[],marker=null,running=false,starting=false,context=null,interval=null,frame=null,startTime=0,nextClick=0,currentMeasure=-1,lastBeat=-1,runTempo=80,version=0;const clicks=new Set();
for(const scale of ['major','minor'])for(let tonic=0;tonic<12;tonic++){const key=keySignature({scale,tonic}),o=document.createElement('option');o.value=`${scale}:${tonic}`;o.textContent=`${key.name} ${scale==='minor'?'minor':'major'}`;$('key').append(o);}
$('key').value='major:0';
for(let midi=48;midi<=84;midi++)for(const id of ['low','high']){const option=document.createElement('option');option.value=midi;option.textContent=noteName(midi);$(id).append(option);}
$('low').value='60';$('high').value='81';
function settings(){const [scale,tonic]=$('key').value.split(':');return {scale,tonic:+tonic,low:+$('low').value,high:+$('high').value,tempo:+$('tempo').value,subdivision:$('subdivision').value,leaps:$('leaps').value,rests:$('rests').value,accidentals:$('accidentals').checked,dotted:$('dotted').checked};}
function validation(){const s=settings();if(!Number.isFinite(s.tempo)||s.tempo<30||s.tempo>200)return 'Choose a tempo from 30 to 200 BPM.';if(s.low>s.high)return 'Lowest note must not exceed highest note.';if(!readingPitches(s).length)return 'Choose a range containing a note in the selected key.';return '';}
function el(tag,attrs={},text,parent=svg){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));if(text!=null)node.textContent=text;parent.append(node);return node;}
function line(x1,y1,x2,y2,parent=svg,width=1){return el('line',{x1,y1,x2,y2,stroke:'#3c4540','stroke-width':width},null,parent);}
function origin(slot){return {x:190+(slot%4)*250,y:65+Math.floor(slot/4)*165};}
function noteY(step,top){return top+40-(step-30)*5;}
function rest(x,y,duration,g){
 const {base,dotted}=rhythmSymbol(duration);
 if(base===4||base===2){
  // Whole rests hang from the fourth line; half rests sit on the middle line.
  el('rect',{x:x-6,y:base===4?y-10:y-4,width:12,height:4,fill:'#27322b'},null,g);
 }else if(base===1){el('path',{d:`M${x-3} ${y-15} l7 9 -7 9 6 7 q-12 -5 -4 -12 l-6 -7 7 -6`,fill:'#27322b'},null,g);
 }else{
  el('circle',{cx:x-2,cy:y-5,r:3.5,fill:'#27322b'},null,g);el('path',{d:`M${x-3} ${y-4} Q${x+6} ${y+1} ${x+8} ${y-10} L${x+1} ${y+16}`,fill:'none',stroke:'#27322b','stroke-width':2},null,g);
  if(base===.25){el('circle',{cx:x-4,cy:y+2,r:3.5,fill:'#27322b'},null,g);el('path',{d:`M${x-3} ${y+3} Q${x+4} ${y+8} ${x+5} ${y+1}`,fill:'none',stroke:'#27322b','stroke-width':2},null,g);}
 }
 if(dotted)el('circle',{cx:x+13,cy:y-5,r:1.8,fill:'#27322b'},null,g);
}
function renderMeasure(slot){
 const old=groups[slot],g=el('g',{'data-measure':slot});if(old)old.replaceWith(g);groups[slot]=g;const {x,y}=origin(slot),measure=measures[slot],key=keySignature(settings()),state=new Map();
 const beams=beamGroups(measure.events),beamed=new Set(beams.flat());
 el('text',{x:x+4,y:y-17,fill:'#858d85','font-size':10},String(measure.number),g);
 for(const [index,event] of measure.events.entries()){const nx=x+12+event.beat/4*226;
  if(event.rest){rest(event.duration===4?x+125:nx,y+20,event.duration,g);continue;}
  const ny=noteY(event.step,y),prior=state.get(event.step)??keyAccidental(event.step,key);
  if(event.accidental!==prior)el('text',{x:nx-13,y:ny+5,'font-size':18,fill:'#27322b','font-family':'Georgia, FreeSerif, serif'},event.accidental===1?'♯':event.accidental===-1?'♭':'♮',g);
  state.set(event.step,event.accidental);
  if(ny<y)for(let yy=y-10;yy>=ny;yy-=10)line(nx-9,yy,nx+9,yy,g);
  if(ny>y+40)for(let yy=y+50;yy<=ny;yy+=10)line(nx-9,yy,nx+9,yy,g);
  el('ellipse',{cx:nx,cy:ny,rx:5,ry:3.6,fill:'#27322b',transform:`rotate(-18 ${nx} ${ny})`},null,g);
  const symbol=rhythmSymbol(event.duration);
  if(symbol.dotted)el('circle',{cx:nx+9,cy:ny-(event.step%2===0?5:0),r:1.8,fill:'#27322b'},null,g);
  if(beamed.has(index))continue;
  const down=ny<y+20,sx=nx+(down?-4:4),end=ny+(down?29:-29);line(sx,ny,sx,end,g,1.5);
  for(let flag=0;flag<symbol.flags;flag++){
   const fy=end+(down?-flag*6:flag*6),d=down?-1:1;
   el('path',{d:`M${sx} ${fy} q10 ${d*7} 4 ${d*17} q5 ${-d*8} -4 ${-d*12}`,fill:'#27322b'},null,g);
  }
 }
 for(const indices of beams){
  const notes=indices.map(i=>({event:measure.events[i],x:x+12+measure.events[i].beat/4*226,y:noteY(measure.events[i].step,y)}));
  const down=notes.reduce((sum,n)=>sum+n.y,0)/notes.length<y+20;
  const beamY=down?Math.max(...notes.map(n=>n.y))+29:Math.min(...notes.map(n=>n.y))-29;
  const offset=down?-4:4;
  for(const n of notes)line(n.x+offset,n.y,n.x+offset,beamY,g,1.5);
  line(notes[0].x+offset,beamY,notes.at(-1).x+offset,beamY,g,3.5);
  // A second beam joins sixteenths; a lone sixteenth gets a short beam hook.
  const secondaryY=beamY+(down?-6:6);
  for(let i=0;i<notes.length;i++){
   if(notes[i].event.duration!==.25)continue;
   const next=notes[i+1],previous=notes[i-1];
   if(next?.event.duration===.25)line(notes[i].x+offset,secondaryY,next.x+offset,secondaryY,g,3.5);
   else if(previous?.event.duration!==.25){
    const neighbor=next??previous,direction=next?1:-1,length=Math.min(9,Math.abs(neighbor.x-notes[i].x)/2);
    line(notes[i].x+offset,secondaryY,notes[i].x+offset+direction*length,secondaryY,g,3.5);
   }
  }
 }
 // Newly refreshed notation stays behind the position marker.
 if(marker)svg.append(marker);
}
function page(){
 svg.replaceChildren();groups=[];marker=null;const s=settings(),key=keySignature(s);measures=[];let previous=32;
 $('accidentals').disabled=s.scale==='chromatic';
 const error=validation();$('start').disabled=Boolean(error);if(error){$('status').textContent=error;$('key-label').textContent='Adjust the range or settings';$('position').textContent='Not playing';return;}

 for(let i=0;i<16;i++){const m=makeMeasure(s,previous);measures.push({...m,number:i+1});previous=m.lastStep;}
 for(let row=0;row<4;row++){const top=65+row*165;for(let i=0;i<5;i++)line(25,top+i*10,1190,top+i*10);
  el('text',{x:35,y:top+42,fill:'#27322b','font-size':70,'font-family':'FreeSerif, Georgia, serif'},'𝄞');
  const positions=key.count<0?[34,37,33,36,32,35]:[38,35,39,36,33,37];positions.slice(0,Math.abs(key.count)).forEach((step,i)=>el('text',{x:85+i*12,y:noteY(step,top)+6,fill:'#27322b','font-size':21,'font-family':'Georgia, FreeSerif, serif'},key.count<0?'♭':'♯'));
  for(const y of [top+18,top+37])el('text',{x:165,y,fill:'#27322b','font-size':22,'font-family':'serif'},'4');
  for(let i=0;i<=4;i++)line(190+i*250,top,190+i*250,top+40,svg,i===4?2:1);
 }
 measures.forEach((_,i)=>renderMeasure(i));marker=el('rect',{x:190,y:43,width:12,height:85,fill:'#777',opacity:.16,'pointer-events':'none',hidden:'true'});
 $('key-label').textContent=`${s.scale==='chromatic'?'Chromatic':`${key.name} ${s.scale==='minor'?'minor':'major'}`} · ${noteName(s.low)}–${noteName(s.high)} · ${s.subdivision==='sixteenth'?'1/16':'1/8'} subdivisions`;$('position').textContent='Ready · 4/4';
}
function stop(message='Stopped. Start again from the top with a four-beat count-in.'){
 version++;running=false;clearInterval(interval);cancelAnimationFrame(frame);for(const source of clicks){try{source.stop();}catch{}}clicks.clear();if(marker)marker.setAttribute('visibility','hidden');$('start').textContent='Start metronome';$('status').textContent=message;
}
function click(when,accent){const oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.value=accent?1300:900;gain.gain.setValueAtTime(+$('click-volume').value*.2,when);gain.gain.exponentialRampToValueAtTime(.0001,when+.04);oscillator.connect(gain);gain.connect(context.destination);clicks.add(oscillator);oscillator.onended=()=>{clicks.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(when);oscillator.stop(when+.045);}
function schedule(){if(!running)return;while(startTime+nextClick*60/runTempo<context.currentTime+.12){const when=startTime+nextClick*60/runTempo;if(when>=context.currentTime)click(when,nextClick%4===0);nextClick++;}}
function animate(){
 if(!running)return;const elapsed=context.currentTime-startTime;
 if(elapsed<0){$('position').textContent='Get ready';}
 else if(elapsed<4*60/runTempo){const beat=Math.floor(elapsed*runTempo/60);if(beat!==lastBeat){lastBeat=beat;$('position').textContent=`Count in · ${beat+1} / 4`;}}
 else{
  const p=positionAt(elapsed-4*60/runTempo,runTempo),slot=p.measure%16;
  for(let m=currentMeasure+1;m<=p.measure;m++){
   const target=refreshSlot(m),prior=measures[(target+15)%16].lastStep;
   measures[target]={...makeMeasure(settings(),prior),number:m+9};renderMeasure(target);
  }
  if(p.measure!==currentMeasure){currentMeasure=p.measure;$('status').textContent='Keep reading. The measure eight ahead refreshes at each bar line.';}
  const {x,y}=origin(slot);marker.removeAttribute('hidden');marker.setAttribute('visibility','visible');marker.setAttribute('x',x+5+p.beat/4*240);marker.setAttribute('y',y-22);
  $('position').textContent=`Measure ${p.measure+1} · beat ${Math.floor(p.beat)+1} · line ${Math.floor(slot/4)+1}`;
 }
 frame=requestAnimationFrame(animate);
}
$('start').onclick=async()=>{
 if(starting)return;if(running){stop();return;}const s=settings(),error=validation();if(error){$('status').textContent=error;return;}
 const ticket=++version;starting=true;$('start').disabled=true;
 try{context ||= new AudioContext({latencyHint:'interactive'});await context.resume();if(ticket!==version)return;page();runTempo=s.tempo;currentMeasure=-1;lastBeat=-1;nextClick=0;startTime=context.currentTime+.1;running=true;$('start').textContent='Stop metronome';$('status').textContent='Four-beat count-in…';schedule();interval=setInterval(schedule,25);animate();}catch(e){stop(`Could not start metronome: ${e.message}`);}finally{starting=false;$('start').disabled=Boolean(validation());}
};
$('new-page').onclick=()=>{stop('New music ready. Start when you are.');page();};
for(const id of ['key','low','high','tempo','subdivision','leaps','rests','accidentals','dotted'])$(id).onchange=()=>{stop('Settings changed. Fresh music ready.');page();};
window.addEventListener('blur',()=>{if(running)stop('Paused when the window lost focus. Start again when ready.');});document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop('Paused while the page was hidden.');});window.addEventListener('keydown',e=>{if(e.code==='Escape'&&running)stop();});page();
