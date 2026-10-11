import {PianoEngine} from '../piano-engine.js';
import {noteName} from '../app.js';
import {makeMelody,pitchPool,availableSettings,resolveSettings,checkMelody,staffY,staffPosition,keySignature,keyAccidental,spellInKey,entryNotation} from './music.js?v=staff-signature-2';
const $=id=>document.getElementById(id),engine=new PianoEngine(),svg=$('staff');
let melody=null,answer=[],notations=[],selected=1,finished=false,showSolution=false,busy=false,version=0,previousFirst=null,cancel=null,correct=0,total=0,number=0,questionSettings=null;
for(let midi=36;midi<=84;midi++)for(const id of ['low','high']){const option=document.createElement('option');option.value=midi;option.textContent=noteName(midi);$(id).append(option);}
$('low').value=60;$('high').value=72;
for(let i=2;i<=16;i++){const option=document.createElement('option');option.value=i;option.textContent=`${i} notes`;$('length').append(option);}$('length').value=8;
['C','C♯ / D♭','D','E♭','E','F','F♯ / G♭','G','A♭','A','B♭','B'].forEach((name,i)=>{const o=document.createElement('option');o.value=i;o.textContent=name;$('tonic').append(o);});
$('tonic').value='0';
function settings(){return {low:+$('low').value,high:+$('high').value,length:+$('length').value,tempo:+$('tempo').value,scale:$('scale').value,difficulty:$('difficulty').value,tonic:$('tonic').value==='any'?'any':+$('tonic').value};}
function valid(){const s=settings();let message='';if(!Number.isFinite(s.tempo)||s.tempo<40||s.tempo>200)message='Choose a tempo from 40 to 200 BPM.';else if(s.low>s.high)message='The lowest note must be below the highest note.';else if(!availableSettings(s).length)message='Choose a range containing at least two notes in the selected pitch set.';$('settings-message').textContent=message;$('tonic').disabled=s.scale==='chromatic';return !message;}
function stop(){cancel?.();cancel=null;engine.stopAll();}
function editable(){return melody&&!finished&&!busy;}
function sync(){const enabled=Boolean(editable());for(const id of ['erase','clear','reveal'])$(id).disabled=!enabled;$('accidentals').disabled=!enabled;$('check').disabled=!enabled||answer.some(n=>n==null);$('listen-answer').disabled=!melody||busy;$('replay').disabled=!melody||busy;$('stop-sound').disabled=!melody;$('next').disabled=busy||!valid();}
function pitchSetLabel(s){const names={major:'major',minor:'natural minor',pentatonic:'major pentatonic'};return s.scale==='chromatic'?'Chromatic':`${keySignature(s).name} ${names[s.scale]}`;}
function currentKey(){const s=melody?questionSettings:settings();return keySignature(s.scale==='any'||s.tonic==='any'?null:s);}
function noteStart(){return 160+Math.abs(currentKey().count)*14;}
function notationFor(midi){return spellInKey(midi,currentKey());}
function setAccidental(value){$('entry-accidental').value=value==='key'?'auto':String(value);}
function selectSlot(i){selected=Math.max(1,Math.min(answer.length-1,i));if(notations[selected])setAccidental(notations[selected].accidental===keyAccidental(notations[selected].step,currentKey())?'key':notations[selected].accidental);draw();}
function enter(i,step){
 if(!editable())return;
 if(i===0){$('entry-status').textContent='Note 1 is given and cannot be changed.';return;}
 let entered;try{entered=entryNotation(step,$('entry-accidental').value,currentKey());}catch(error){$('entry-status').textContent=error.message;return;}
 const {midi:pitch,accidental}=entered;
 if(!pitchPool(questionSettings).includes(pitch)){$('entry-status').textContent=`${noteName(pitch)} is outside the selected range or scale. Choose another staff position or accidental.`;return;}
 answer[i]=pitch;notations[i]={step,accidental};selected=i;draw();sync();$('slots').children[i].focus({preventScroll:true});$('entry-status').textContent=`Note ${i+1}: ${noteName(pitch)}. ${answer.slice(1).filter(n=>n!=null).length} of ${answer.length-1} entered.`;
}
function element(tag,attrs={},text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))e.setAttribute(key,String(value));if(text!=null)e.textContent=text;svg.append(e);return e;}
function line(x1,y1,x2,y2,attrs={}){return element('line',{x1,y1,x2,y2,stroke:'#87988d','stroke-width':1,...attrs});}
function note(x,midi,notation,color,measure){
 const n=notation??notationFor(midi),staff=midi>=60?'treble':'bass',y=staffY(n.step,staff),top=staff==='treble'?70:170,bottom=top+40;
 if(y<top)for(let yy=top-10;yy>=y;yy-=10)line(x-13,yy,x+13,yy,{stroke:color});
 if(y>bottom)for(let yy=bottom+10;yy<=y;yy+=10)line(x-13,yy,x+13,yy,{stroke:color});
 element('ellipse',{cx:x,cy:y,rx:7,ry:4.7,fill:color,transform:`rotate(-18 ${x} ${y})`});
 const down=y<top+20;line(x+(down?-6:6),y,x+(down?-6:6),y+(down?32:-32),{stroke:color,'stroke-width':1.6});
 const previous=measure.get(n.step)??keyAccidental(n.step,currentKey());
 if(n.accidental!==previous)element('text',{x:x-23,y:y+6,fill:color,'font-size':23,'font-family':'Georgia, FreeSerif, serif'},n.accidental===1?'♯':n.accidental===-1?'♭':'♮');
 measure.set(n.step,n.accidental);
}
function draw(){
 const length=melody?.length??8,width=noteStart()+30+length*64;svg.setAttribute('viewBox',`0 0 ${width} 280`);svg.style.minWidth=width+'px';svg.replaceChildren();
 element('title',{},'Grand staff: quarter-note melodic dictation');
 element('rect',{x:0,y:0,width,height:280,fill:'#eef0e6',rx:8});
 for(const top of [70,170])for(let i=0;i<5;i++)line(20,top+i*10,width-20,top+i*10);
 line(20,70,20,210,{'stroke-width':2});element('path',{d:'M 15 65 Q 3 65 8 105 Q 12 130 3 140 Q 12 150 8 175 Q 3 215 15 215',fill:'none',stroke:'#3c5145','stroke-width':2});
 element('text',{x:31,y:111,fill:'#253c2b','font-size':70,'font-family':'FreeSerif, Georgia, serif'},'𝄞');element('text',{x:30,y:207,fill:'#253c2b','font-size':59,'font-family':'FreeSerif, Georgia, serif'},'𝄢');
 const key=currentKey();
 $('key-description').textContent=(melody||settings().scale!=='any'&&settings().tonic!=='any')?`${pitchSetLabel(melody?questionSettings:settings())} · ${Math.abs(key.count)} ${key.count<0?'flats':'sharps'} in the staff signature`:'The key signature will appear when a melody is chosen.';
 const positions=key.count<0?[34,37,33,36,32,35,31]:[38,35,39,36,33,37,34];
 for(const staff of ['treble','bass'])positions.slice(0,Math.abs(key.count)).forEach((step,i)=>element('text',{x:80+i*14,y:staffY(step-(staff==='bass'?14:0),staff)+6,fill:'#253c2b','font-size':23,'font-family':'Georgia, FreeSerif, serif'},key.count<0?'♭':'♯'));
 for(const y of [89,108,189,208])element('text',{x:98+Math.abs(key.count)*14,y,fill:'#253c2b','font-size':23,'font-family':'serif'},'4');
 element('text',{x:25,y:34,fill:'#546d5a','font-size':11},'TREBLE');element('text',{x:25,y:260,fill:'#546d5a','font-size':11},'BASS');
 if(!melody){element('text',{x:160,y:145,fill:'#546d5a','font-size':15},'Start a dictation to hear your melody.');$('slots').replaceChildren();return;}
 const result=finished?checkMelody(melody,answer):null,measure=new Map();
 for(let i=0;i<length;i++){
  const x=noteStart()+i*64;
  if(i%4===0)measure.clear();
  if(i>0&&i%4===0)line(x-34,70,x-34,210);
  element('rect',{x:x-30,y:42,width:60,height:198,fill:i===selected&&!finished?'#b6d69b':'transparent',opacity:.35,rx:5});
  const pitch=showSolution?melody[i]:answer[i],color=i===0?'#315d93':finished&&!showSolution&&!result.matches[i]?'#9d4029':'#253c2b';
  if(pitch!=null)note(x,pitch,showSolution?null:notations[i],color,measure);else element('text',{x,y:146,fill:'#80927f','font-size':20,'text-anchor':'middle'},'?');
  element('text',{x,y:26,fill:'#546d5a','font-size':11,'text-anchor':'middle'},i===0?'1 · GIVEN':String(i+1));
 }
 line(width-24,70,width-24,210);line(width-20,70,width-20,210,{'stroke-width':3});
 svg.setAttribute('aria-label',`Grand staff. Key signature: ${key.count===0?'no sharps or flats':`${Math.abs(key.count)} ${key.count<0?'flats':'sharps'}`}. ${showSolution?'Solution':'Your answer'}: ${(showSolution?melody:answer).map((n,i)=>`note ${i+1} ${n==null?'empty':noteName(n)}`).join(', ')}.`);
 $('slots').replaceChildren();answer.forEach((pitch,i)=>{const b=document.createElement('button');b.type='button';b.textContent=`${i+1}${i===0?' · given':pitch==null?' · —':''}`;b.disabled=i===0||finished||busy;b.setAttribute('aria-label',`Note ${i+1}: ${pitch==null?'empty':noteName(pitch)}${i===0?', given':''}`);b.setAttribute('aria-pressed',String(i===selected));b.onclick=()=>{selectSlot(i);$('slots').children[i].focus();};b.onkeydown=e=>{
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Delete','Backspace'].includes(e.code))return;e.preventDefault();e.stopPropagation();
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){selectSlot(i+(e.code==='ArrowRight'?1:-1));$('slots').children[selected].focus();return;}
  if(e.code==='Delete'||e.code==='Backspace'){erase();$('slots').children[i].focus();return;}
  const start=notations[i]?.step??notationFor(melody[0]).step;enter(i,start+(e.code==='ArrowUp'?1:-1));$('slots').children[i].focus();
 };$('slots').append(b);});
}
svg.addEventListener('click',e=>{if(!editable())return;const matrix=svg.getScreenCTM();if(!matrix)return;const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());const i=Math.round((point.x-noteStart())/64);if(i<0||i>=answer.length||point.y<42||point.y>240)return;enter(i,staffPosition(point.y).step);});
function erase(){if(!editable())return;answer[selected]=null;notations[selected]=null;draw();sync();$('entry-status').textContent=`Note ${selected+1} cleared.`;}
$('erase').onclick=erase;$('clear').onclick=()=>{if(!editable())return;answer=melody.map((m,i)=>i===0?m:null);notations=answer.map(m=>m==null?null:notationFor(m));selected=1;draw();sync();$('entry-status').textContent='Answer cleared; the first note remains.';};
function play(notes){stop();cancel=engine.playMelody(notes,{tempo:questionSettings.tempo});}
$('next').onclick=async()=>{
 if(busy||!valid())return;busy=true;const ticket=++version;stop();sync();
 try{await engine.load((n,t)=>{if(ticket===version)$('audio-status').textContent=`Loading piano samples… ${n} / ${t}`;});if(ticket!==version)return;
 questionSettings=resolveSettings(settings());melody=makeMelody(questionSettings,previousFirst);previousFirst=melody[0];answer=melody.map((m,i)=>i===0?m:null);notations=answer.map(m=>m==null?null:notationFor(m));selected=1;setAccidental('key');finished=showSolution=false;number++;$('feedback').replaceChildren();$('solution-toggle').hidden=true;$('question-number').textContent=`MELODY ${number} · ♩ = ${questionSettings.tempo} · ${pitchSetLabel(questionSettings)} · ${questionSettings.difficulty}`;$('next').textContent='Skip / new melody';$('audio-status').textContent='Listen to the melody. Replay as often as you like.';$('entry-status').textContent=`First note: ${noteName(melody[0])}. Enter the remaining ${melody.length-1} notes.`;play(melody);
 }catch(e){$('audio-status').textContent=`Could not start dictation: ${e.message}. Try again.`;}finally{busy=false;draw();sync();}
};
$('replay').onclick=()=>{if(melody){play(melody);$('audio-status').textContent='Replaying the melody.';}};$('listen-answer').onclick=()=>{if(melody){play(answer);$('audio-status').textContent='Playing your answer. Empty slots are silent beats.';}};$('stop-sound').onclick=()=>{stop();$('audio-status').textContent='Sound stopped.';};
const solutionToggle=document.createElement('button');solutionToggle.id='solution-toggle';solutionToggle.hidden=true;solutionToggle.textContent='Show solution on staff';solutionToggle.onclick=()=>{showSolution=!showSolution;solutionToggle.textContent=showSolution?'Show my answer on staff':'Show solution on staff';solutionToggle.setAttribute('aria-pressed',String(showSolution));draw();};$('feedback').before(solutionToggle);
function finish(reveal=false){if(!editable()||(!reveal&&answer.some(n=>n==null)))return;stop();finished=true;const result=checkMelody(melody,answer);total++;if(!reveal&&result.correct)correct++;$('score').textContent=`${correct} / ${total} melodies correct`;$('next').textContent='Next melody';$('feedback').className=!reveal&&result.correct?'correct':'incorrect';const heading=document.createElement('strong');heading.textContent=reveal?'Melody revealed':result.correct?'Correct — every note matches!':`${result.right} of ${result.total} entered notes correct.`;const detail=document.createElement('p');detail.textContent=`Melody: ${melody.map(noteName).join(' – ')}.`;const help=document.createElement('p');help.textContent=reveal?'Revealed melodies count as missed.':'The first note is given and is excluded from the note count. Incorrect notes appear in orange; compare with the solution.';$('feedback').replaceChildren(heading,detail,help);solutionToggle.hidden=false;showSolution=reveal;solutionToggle.textContent=reveal?'Show my answer on staff':'Show solution on staff';solutionToggle.setAttribute('aria-pressed',String(reveal));$('entry-status').textContent='Answer complete. Compare the staff with the solution or start the next melody.';draw();sync();}
$('check').onclick=()=>finish();$('reveal').onclick=()=>finish(true);$('reset-score').onclick=()=>{correct=total=0;$('score').textContent='0 / 0 melodies correct';};$('exercise-volume').oninput=e=>engine.setVolume(+e.target.value);
function invalidate(){version++;stop();melody=null;answer=[];notations=[];finished=false;showSolution=false;$('feedback').replaceChildren();solutionToggle.hidden=true;$('audio-status').textContent='Settings changed. Start a new melody.';$('entry-status').textContent='No melody yet.';$('next').textContent='Start dictation';draw();sync();}
for(const id of ['low','high','length','tempo','scale','tonic','difficulty'])$(id).addEventListener('change',invalidate);
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('keydown',e=>{if(e.code==='Escape')stop();});draw();sync();
