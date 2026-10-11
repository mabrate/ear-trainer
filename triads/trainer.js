import {PianoEngine} from '../piano-engine.js';
import {noteName} from '../app.js';
import {newQuestion,grade} from './theory.js';
const $=id=>document.getElementById(id),engine=new PianoEngine();
let question=null,previous=null,cancelPlayback=null,answered=false,busy=false,total=0,correct=0,number=0,version=0;
const inversionNames=['Root position','First inversion','Second inversion'];
for(let midi=36;midi<=96;midi++)for(const id of ['low','high']){const option=document.createElement('option');option.value=midi;option.textContent=noteName(midi);$(id).append(option);}
$('low').value='48';$('high').value='77';
function settings(){return {low:+$('low').value,high:+$('high').value,inversions:$('inversions').checked,presentation:$('mixed').checked?'mixed':$('arpeggiated').checked?'arpeggiated':'block'};}
function valid(){const s=settings(),ok=s.high-s.low>=9;$('settings-message').textContent=ok?'':'Select a range of at least 9 semitones to fit every triad and inversion.';return ok;}
function silence(){cancelPlayback?.();cancelPlayback=null;engine.stopAll();}
function answerState(enabled){for(const id of ['quality-options','inversion-options','presentation-options'])$(id).disabled=!enabled;for(const id of ['check','reveal'])$(id).disabled=!enabled;}
function syncQuestions(){const s=settings();$('inversion-options').hidden=!s.inversions;$('presentation-options').hidden=s.presentation!=='mixed';$('arpeggiated').disabled=$('mixed').checked;document.querySelectorAll('[name=inversion]').forEach(e=>e.required=s.inversions);document.querySelectorAll('[name=presentation]').forEach(e=>e.required=s.presentation==='mixed');}
function updateScore(){$('score').textContent=`${correct} / ${total} correct`;}
function invalidate(){version++;silence();question=null;answered=false;$('answer').reset();answerState(false);$('replay').disabled=true;$('silence').disabled=true;$('feedback').replaceChildren();$('prompt').textContent='Ready for a new chord.';$('audio-status').textContent='Settings changed. Start a new question.';$('next').textContent='New question';$('next').disabled=busy||!valid();syncQuestions();}
for(const id of ['low','high','inversions','arpeggiated','mixed'])$(id).addEventListener('change',invalidate);
function play(){silence();cancelPlayback=engine.playChord(question.notes,{arpeggiated:question.arpeggiated});$('audio-status').textContent='Listen, then choose your answer. Replay as often as you like.';}
$('next').onclick=async()=>{
 if(busy||!valid())return;busy=true;const ticket=++version;$('next').disabled=true;answerState(false);$('replay').disabled=true;silence();
 try{
  $('audio-status').textContent=engine.ready?'Preparing chord…':'Loading local piano samples…';
  await engine.load((n,t)=>{if(ticket===version)$('audio-status').textContent=`Loading local piano samples… ${n} / ${t}`;});
  if(ticket!==version)return;
  question=newQuestion(settings(),previous);previous=question;answered=false;number++;$('answer').reset();syncQuestions();$('feedback').replaceChildren();
  $('question-number').textContent=`QUESTION ${number}`;$('prompt').textContent='What do you hear?';$('next').textContent='Skip / new question';$('replay').disabled=false;$('silence').disabled=false;answerState(true);play();
 }catch(e){question=null;$('audio-status').textContent=`Could not start: ${e.message}. Check the sample files and try again.`;$('next').textContent='Retry';}
 finally{busy=false;$('next').disabled=!valid();}
};
$('replay').onclick=()=>{if(question)play();};$('silence').onclick=()=>{silence();$('audio-status').textContent='Sound stopped. Replay when ready.';};
function feedback(result,revealed=false){
 answered=true;answerState(false);$('next').textContent='Next question';const q=question;
 const title=document.createElement('strong');title.textContent=revealed?'Answer revealed':result.correct?'Correct!':'Keep listening — here’s the answer.';
 const details=document.createElement('p');const inversion=q.quality==='augmented'?'Inversion ambiguous (symmetric augmented triad)':inversionNames[q.inversion];
 details.textContent=`${q.quality[0].toUpperCase()+q.quality.slice(1)} · ${inversion} · ${q.arpeggiated?'Arpeggiated':'Together'}. Notes, low to high: ${q.notes.map(noteName).join(' – ')}.`;
 $('feedback').replaceChildren(title,details);$('feedback').className=revealed?'revealed':result.correct?'correct':'incorrect';
 if(!revealed){const breakdown=document.createElement('p');breakdown.textContent=[`Quality: ${result.quality?'correct':'incorrect'}`,q.askInversion?`Inversion: ${result.inversion?'correct':'incorrect'}`:null,q.askPresentation?`Playback: ${result.presentation?'correct':'incorrect'}`:null].filter(Boolean).join(' · ');$('feedback').append(breakdown);}
 if(revealed){const note=document.createElement('p');note.textContent='Revealed questions count as missed. Replaying is always free.';$('feedback').append(note);}
}
$('answer').onsubmit=e=>{e.preventDefault();if(!question||answered||busy)return;const data=new FormData($('answer')),result=grade(question,Object.fromEntries(data));total++;if(result.correct)correct++;updateScore();feedback(result);};
$('reveal').onclick=()=>{if(!question||answered||busy)return;total++;updateScore();feedback(null,true);};
$('reset-score').onclick=()=>{total=correct=0;updateScore();};$('exercise-volume').oninput=e=>engine.setVolume(+e.target.value);
window.addEventListener('blur',silence);document.addEventListener('visibilitychange',()=>{if(document.hidden)silence();});window.addEventListener('keydown',e=>{if(e.code==='Escape')silence();});syncQuestions();valid();
