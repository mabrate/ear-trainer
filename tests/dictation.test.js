import test from 'node:test';
import assert from 'node:assert/strict';
import {pitchPool,makeMelody,spell,midiFromStep,staffY,staffPosition,checkMelody} from '../melodic-dictation/music.js';
test('scale filters honor tonic and inclusive range',()=>{
 assert.deepEqual(pitchPool({low:60,high:72,scale:'major',tonic:0}),[60,62,64,65,67,69,71,72]);
 assert.deepEqual(pitchPool({low:60,high:72,scale:'major',tonic:2}),[61,62,64,66,67,69,71]);
 assert.deepEqual(pitchPool({low:60,high:72,scale:'minor',tonic:0}),[60,62,63,65,67,68,70,72]);
 assert.deepEqual(pitchPool({low:60,high:72,scale:'pentatonic',tonic:0}),[60,62,64,67,69,72]);
 assert.equal(pitchPool({low:60,high:72,scale:'chromatic',tonic:5}).length,13);
});
test('melodies have requested length, range and scale; starting notes vary',()=>{
 for(const scale of ['chromatic','major','minor','pentatonic'])for(let tonic=0;tonic<12;tonic++){
  const settings={low:48,high:77,length:16,scale,tonic};const pool=pitchPool(settings);let previous;
  for(let j=0;j<20;j++){const melody=makeMelody(settings,previous);assert.equal(melody.length,16);assert(melody.every(n=>pool.includes(n)));assert.notEqual(melody[0],previous);assert(melody.slice(1).every((n,i)=>n!==melody[i]));previous=melody[0];}
 }
 assert.throws(()=>makeMelody({low:60,high:61,length:8,scale:'major',tonic:0}));
});
test('staff positions and accidentals round trip all supported pitches',()=>{
 for(let midi=36;midi<=84;midi++)for(const flats of [false,true]){const n=spell(midi,flats);assert.equal(midiFromStep(n.step,n.accidental),midi);const staff=midi>=60?'treble':'bass';assert.equal(staffPosition(staffY(n.step,staff)).step,n.step);}
 assert.equal(staffY(spell(64).step,'treble'),110);assert.equal(staffY(spell(43).step,'bass'),210);
 assert.equal(midiFromStep(28),60);assert.equal(midiFromStep(28,1),61);assert.equal(midiFromStep(28,-1),59);
});
test('grading handles empty and wrong notes, excludes supplied note from score',()=>{
 assert.deepEqual(checkMelody([60,62,64],[60,62,64]),{matches:[true,true,true],correct:true,right:2,total:2});
 assert.deepEqual(checkMelody([60,62,64],[60,null,65]),{matches:[true,false,false],correct:false,right:0,total:2});
 assert.equal(checkMelody([60,62,64],[60,62,65]).right,1);
});
test('any tonic and pitch set resolve independently and respect narrow ranges',async()=>{
 const {availableSettings,resolveSettings}=await import('../melodic-dictation/music.js');
 const base={low:60,high:72,length:8,tempo:90,scale:'any',tonic:'any'};
 assert.equal(availableSettings(base).length,48);
 const seenSets=new Set(),seenTonics=new Set();
 for(let i=0;i<48;i++){
  let call=0;const resolved=resolveSettings(base,()=>call++===0?Math.floor(i/12)/4:(i%12)/12);
  seenSets.add(resolved.scale);seenTonics.add(resolved.tonic);
  assert(makeMelody(resolved).every(n=>pitchPool(resolved).includes(n)));
 }
 assert.equal(seenSets.size,4);assert.equal(seenTonics.size,12);
 assert.equal(resolveSettings({...base,scale:'minor'},()=>.99).scale,'minor');
 assert.equal(resolveSettings({...base,tonic:5},()=>.99).tonic,5);
 const narrow={...base,low:60,high:61};assert(availableSettings(narrow).every(s=>pitchPool(s).length>=2));
 assert.throws(()=>resolveSettings({...base,low:60,high:60}));
});
test('difficulty controls motion while preserving range and pitch set',()=>{
 function seeded(){let state=42;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
 const settings={low:48,high:84,length:10000,scale:'major',tonic:0};const pool=pitchPool(settings);
 const stats={};for(const difficulty of ['easy','medium','hard']){
  const melody=makeMelody({...settings,difficulty},null,seeded());let steps=0,wide=0,repeats=0;
  assert(melody.every(n=>pool.includes(n)));
  for(let i=1;i<melody.length;i++){
   const span=Math.abs(melody[i]-melody[i-1]);if(Math.abs(pool.indexOf(melody[i])-pool.indexOf(melody[i-1]))===1)steps++;
   if(span>12)wide++;if(span===0)repeats++;
   if(difficulty==='easy')assert(span<=7);if(difficulty==='medium')assert(span<=12);
  }
  stats[difficulty]={steps:steps/9999,wide,repeats};
 }
 assert(stats.easy.steps>.75&&stats.easy.steps<.85);
 assert(stats.medium.steps>.35&&stats.medium.steps<.45);
 assert(stats.hard.wide>0);assert(stats.hard.repeats>0);
 for(const difficulty of ['easy','medium','hard'])assert(makeMelody({...settings,low:60,high:62,difficulty},null,seeded()).every(n=>n===60||n===62));
});
test('key signatures and note spelling match all tonal pitch sets',async()=>{
 const {keySignature,keyAccidental,spellInKey}=await import('../melodic-dictation/music.js');
 assert.equal(keySignature({scale:'major',tonic:7}).count,1);
 assert.equal(keySignature({scale:'major',tonic:5}).count,-1);
 assert.equal(keySignature({scale:'minor',tonic:9}).count,0);
 assert.equal(keySignature({scale:'minor',tonic:0}).count,-3);
 assert.equal(keySignature({scale:'chromatic',tonic:6}).count,0);
 for(const scale of ['major','minor','pentatonic'])for(let tonic=0;tonic<12;tonic++){
  const settings={low:36,high:84,scale,tonic},key=keySignature(settings);
  for(const midi of pitchPool(settings)){const n=spellInKey(midi,key);assert.equal(midiFromStep(n.step,n.accidental),midi);assert.equal(n.accidental,keyAccidental(n.step,key));}
 }
 // F-sharp major needs E-sharp, and E-flat minor needs C-flat.
 const fs=keySignature({scale:'major',tonic:6});assert.deepEqual(spellInKey(65,fs),{step:30,accidental:1});
 const ebm=keySignature({scale:'minor',tonic:3});assert.deepEqual(spellInKey(59,ebm),{step:28,accidental:-1});
});
test('staff-following input and explicit overrides produce finite pitches',async()=>{
 const {keySignature,entryNotation}=await import('../melodic-dictation/music.js');
 for(const scale of ['chromatic','major','minor','pentatonic'])for(let tonic=0;tonic<12;tonic++)for(let step=14;step<=42;step++)for(const mode of ['auto','key','-1','0','1']){
  const note=entryNotation(step,mode,keySignature({scale,tonic}));assert(Number.isFinite(note.midi));
 }
 const g=keySignature({scale:'major',tonic:7});assert.equal(entryNotation(31,'auto',g).midi,66);assert.equal(entryNotation(31,'0',g).midi,65);
 const f=keySignature({scale:'major',tonic:5});assert.equal(entryNotation(34,'auto',f).midi,70);
 assert.throws(()=>entryNotation(NaN,'auto',g));assert.throws(()=>entryNotation(31,'invalid',g));
});
