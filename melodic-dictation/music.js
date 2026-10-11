const natural=[0,2,4,5,7,9,11];
export const scales={chromatic:null,major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],pentatonic:[0,2,4,7,9]};
export function midiFromStep(step,accidental=0){return (Math.floor(step/7)+1)*12+natural[((step%7)+7)%7]+accidental;}
export function spell(midi,preferFlats=false){
 const pc=midi%12,octave=Math.floor(midi/12)-1;
 let letter=natural.indexOf(pc),accidental=0;
 if(letter<0){letter=natural.indexOf(pc+(preferFlats?1:-1));accidental=preferFlats?-1:1;}
 return {step:octave*7+letter,accidental};
}
export function pitchPool({low,high,scale,tonic}){const intervals=scales[scale];return Array.from({length:Math.max(0,high-low+1)},(_,i)=>low+i).filter(m=>!intervals||intervals.includes((m-tonic+12)%12));}
/** Expand random selectors to concrete combinations that fit the chosen range. */
export function availableSettings(settings){
 const pitchSets=settings.scale==='any'?Object.keys(scales):[settings.scale];
 const tonics=settings.tonic==='any'?Array.from({length:12},(_,i)=>i):[settings.tonic];
 return pitchSets.flatMap(scale=>tonics.map(tonic=>({...settings,scale,tonic}))).filter(s=>pitchPool(s).length>=2);
}
export function resolveSettings(settings,random=Math.random){
 const options=availableSettings(settings);
 if(!options.length)throw Error('Choose a range containing at least two allowed notes.');
 const pick=xs=>xs[Math.floor(random()*xs.length)];
 const scale=pick([...new Set(options.map(s=>s.scale))]);
 return pick(options.filter(s=>s.scale===scale));
}
export function makeMelody(settings,previousFirst=null,random=Math.random){
 const pool=pitchPool(settings);if(pool.length<2)throw Error('Choose a range containing at least two allowed notes.');
 const pick=xs=>xs[Math.floor(random()*xs.length)],first=pick(pool.filter(n=>n!==previousFirst));
 const difficulty=settings.difficulty??'easy';
 const notes=[first];
 while(notes.length<settings.length){
  const current=notes.at(-1),index=pool.indexOf(current);
  if(difficulty==='hard'){notes.push(pick(pool));continue;}
  // Neighbors follow the selected pitch set, including sparse pentatonic scales.
  const steps=[pool[index-1],pool[index+1]].filter(n=>n!==undefined);
  const maxLeap=difficulty==='medium'?12:7;
  const leaps=pool.filter(n=>n!==current&&!steps.includes(n)&&Math.abs(n-current)<=maxLeap);
  const useSteps=random()<(difficulty==='medium'?.4:.8);
  notes.push(pick(useSteps||!leaps.length?steps:leaps));
 }
 return notes;
}
export function checkMelody(expected,entered){const matches=expected.map((m,i)=>m===entered[i]);return {matches,correct:matches.every(Boolean),right:matches.slice(1).filter(Boolean).length,total:expected.length-1};}
export function staffY(step,staff){return staff==='treble'?110-(step-30)*5:210-(step-18)*5;}
export function staffPosition(y){const staff=y<140?'treble':'bass';return {staff,step:Math.round(staff==='treble'?30+(110-y)/5:18+(210-y)/5)};}
/** Conventional enharmonic keys, avoiding seven-accidental signatures. */
export function keySignature(settings){
 const alterations=Array(7).fill(0);
 if(!settings||settings.scale==='chromatic')return {count:0,alterations,name:'Chromatic'};
 const minor=settings.scale==='minor';
 const counts=minor?[-3,4,-1,-6,1,-4,3,-2,5,0,-5,2]:[0,-5,2,-3,4,-1,6,1,-4,3,-2,5];
 const names=minor?['C','C♯','D','E♭','E','F','F♯','G','G♯','A','B♭','B']:['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
 const count=counts[settings.tonic],order=count<0?[6,2,5,1,4,0,3]:[3,0,4,1,5,2,6];
 order.slice(0,Math.abs(count)).forEach(letter=>alterations[letter]=Math.sign(count));
 return {count,alterations,name:names[settings.tonic]};
}
export function keyAccidental(step,key){return key.alterations[((step%7)+7)%7];}
export function spellInKey(midi,key){
 const octave=Math.floor(midi/12)-1;
 for(let step=(octave-1)*7;step<(octave+2)*7;step++){
  const accidental=keyAccidental(step,key);
  if(midiFromStep(step,accidental)===midi)return {step,accidental};
 }
 return spell(midi,key.count<0);
}
/** Resolve note entry without coercing a named mode into a numeric accidental. */
export function entryNotation(step,mode,key){
 if(!Number.isInteger(step))throw Error('Choose a staff line or space.');
 const accidental=mode==='auto'||mode==='key'?keyAccidental(step,key):Number(mode);
 if(![-1,0,1].includes(accidental))throw Error('Choose a valid accidental.');
 return {step,accidental,midi:midiFromStep(step,accidental)};
}
