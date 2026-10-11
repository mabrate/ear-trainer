import {keySignature,keyAccidental,midiFromStep,spell,spellInKey} from '../melodic-dictation/music.js';
/** Concrete sounding pitches, with conventional spelling for the selected key. */
export function readingPitches(settings){
 const low=settings.low??60,high=settings.high??81,key=keySignature(settings);
 if(!Number.isInteger(low)||!Number.isInteger(high)||low>high)return [];
 return Array.from({length:high-low+1},(_,i)=>low+i).map(midi=>({midi,...(settings.scale==='chromatic'?spell(midi):spellInKey(midi,key))})).filter(n=>settings.scale==='chromatic'||n.accidental===keyAccidental(n.step,key));
}
export function makeMeasure(settings,previousStep=32,random=Math.random){
 const key=keySignature(settings),grid=settings.subdivision==='sixteenth'?4:2,ticks=grid*4;
 const pitches=readingPitches(settings);if(!pitches.length)throw Error('Choose a range containing a note in the selected key.');
 const low=settings.low??60,high=settings.high??81;
 const pick=xs=>xs[Math.floor(random()*xs.length)];
 let tick=0,step=pitches.reduce((best,n)=>Math.abs(n.step-previousStep)<Math.abs(best.step-previousStep)?n:best).step;const events=[];
 while(tick<ticks){
  // Dotted quarters stay within a half-measure; shorter rhythms retain beat grouping.
  const remaining=grid-tick%grid;
  const durations=[grid,grid/2,...(grid===4?[1]:[])].filter(n=>n<=remaining);
  if(settings.dotted){
   if(grid===4&&tick%grid===0)durations.push(3); // dotted eighth + sixteenth
   if(tick%(2*grid)===0)durations.push(grid*1.5); // dotted quarter + eighth
  }
  const duration=pick(durations),rest=settings.rests==='none'?false:settings.rests==='simple'?tick%grid===0&&duration===grid&&random()<.2:random()<.24;
  let accidental=null,midi=null;
  if(!rest){
   const reach={small:2,medium:4,large:Infinity}[settings.leaps]??2;
   const pool=pitches.filter(n=>Math.abs(n.step-step)<=reach);
   const chosen=pick(pool.length?pool:pitches);step=chosen.step;accidental=chosen.accidental;midi=chosen.midi;
   if(settings.scale!=='chromatic'&&settings.accidentals&&random()<.18){
    const alterations=[-1,0,1].filter(n=>n!==accidental&&midiFromStep(step,n)>=low&&midiFromStep(step,n)<=high);
    if(alterations.length){accidental=pick(alterations);midi=midiFromStep(step,accidental);}
   }
  }
  events.push({beat:tick/grid,duration:duration/grid,rest,step:rest?null:step,accidental,midi});tick+=duration;
 }
 return {events:consolidateRests(events,settings.dotted),lastStep:step};
}
export function refreshSlot(absoluteMeasure){return (absoluteMeasure+8)%16;}
export function positionAt(elapsed,tempo){const beats=Math.max(0,elapsed)*tempo/60;return {measure:Math.floor(beats/4),beat:beats%4};}
/** Beam by beat, joining four eighths across beats 1–2 or 3–4. */
export function beamGroups(events){
 const groups=[];let run=[];
 function flush(){if(run.length>1)groups.push(run);run=[];}
 events.forEach((event,i)=>{
  if(event.rest||event.duration>=1){flush();return;}
  const previous=events[run.at(-1)];
  if(previous&&(Math.floor(previous.beat)!==Math.floor(event.beat)||Math.abs(previous.beat+previous.duration-event.beat)>1e-9))flush();
  run.push(i);
 });flush();
 const merged=[];
 for(let i=0;i<groups.length;i++){
  const first=groups[i],second=groups[i+1],start=events[first[0]].beat;
  const combined=second?[...first,...second]:[];
  if((start===0||start===2)&&first.length===2&&second?.length===2&&combined.every((index,j)=>events[index].duration===.5&&events[index].beat===start+j*.5)){
   merged.push(combined);i++;
  }else merged.push(first);
 }
 return merged;
}

export function rhythmSymbol(duration){
 const dotted=duration===1.5||duration===.75||duration===.375;
 const base=dotted?duration/1.5:duration;
 return {base,dotted,flags:base===.25?2:base===.5?1:0};
}
/** Combine silence without hiding the beat or crossing the half-measure boundary. */
export function consolidateRests(events,dotted=false){
 const result=[];
 for(let i=0;i<events.length;){
  const event=events[i];if(!event.rest){result.push(event);i++;continue;}
  let end=event.beat+event.duration,j=i+1;
  while(j<events.length&&events[j].rest&&Math.abs(events[j].beat-end)<1e-9){end+=events[j].duration;j++;}
  let beat=event.beat;
  while(beat<end-1e-9){
   const choices=[{duration:4,alignment:4},{duration:2,alignment:2},...(dotted?[{duration:1.5,alignment:2}]:[]),{duration:1,alignment:1},...(dotted?[{duration:.75,alignment:1}]:[]),{duration:.5,alignment:.5},{duration:.25,alignment:.25}];
   const duration=choices.find(c=>Math.abs(beat/c.alignment-Math.round(beat/c.alignment))<1e-9&&beat+c.duration<=end+1e-9)?.duration;
   if(!duration)throw Error('Rest durations must use eighth- or sixteenth-note subdivisions.');
   result.push({...event,beat,duration});beat+=duration;
  }
  i=j;
 }
 return result;
}
