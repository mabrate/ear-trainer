import test from 'node:test';
import assert from 'node:assert/strict';
import {makeMeasure,refreshSlot,positionAt} from '../sight-reading/music.js';
import {keySignature,keyAccidental,midiFromStep} from '../melodic-dictation/music.js';
function seeded(){let x=321;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
test('all measures fill four beats, obey rhythmic grid, signature and leap limits',()=>{
 const random=seeded();for(const subdivision of ['eighth','sixteenth'])for(const leaps of ['small','medium','large'])for(const rests of ['none','simple','complex'])for(const scale of ['major','minor'])for(let tonic=0;tonic<12;tonic++){
  const settings={subdivision,leaps,rests,scale,tonic,accidentals:false},key=keySignature(settings),measure=makeMeasure(settings,32,random);let end=0,previous=32;
  for(const e of measure.events){assert.equal(e.beat,end);end+=e.duration;if(!e.rest){assert(e.beat%1+e.duration<=1);assert((subdivision==='eighth'?[1,.5]:[1,.5,.25]).includes(e.duration));}else assert([4,2,1,.5,.25].includes(e.duration));if(e.rest){assert.notEqual(rests,'none');if(rests==='simple')assert([1,2,4].includes(e.duration));}else{assert(e.step>=28&&e.step<=40);assert(Math.abs(e.step-previous)<={small:2,medium:4,large:12}[leaps]);assert.equal(e.accidental,keyAccidental(e.step,key));assert.equal(e.midi,midiFromStep(e.step,e.accidental));previous=e.step;}}
  assert.equal(end,4);assert.equal(measure.lastStep,previous);
 }
});
test('allowing accidentals produces notes outside the signature',()=>{
 const s={scale:'major',tonic:7,subdivision:'sixteenth',leaps:'large',rests:'none',accidentals:true},random=seeded();let altered=0;for(let i=0;i<30;i++)for(const e of makeMeasure(s,32,random).events)if(e.accidental!==keyAccidental(e.step,keySignature(s)))altered++;assert(altered>0);
});
test('refresh targets are eight measures ahead and never the playing measure',()=>{
 for(let i=0;i<100;i++){assert.equal(refreshSlot(i),(i+8)%16);assert.notEqual(refreshSlot(i),i%16);}assert.equal(refreshSlot(8),0);
 assert.deepEqual(positionAt(0,120),{measure:0,beat:0});assert.deepEqual(positionAt(2,120),{measure:1,beat:0});assert.deepEqual(positionAt(3.25,120),{measure:1,beat:2.5});
});
test('beams join pairs and groups of four, break at rests and beats, and support mixed rhythms',async()=>{
 const {beamGroups}=await import('../sight-reading/music.js');
 const note=(beat,duration,rest=false)=>({beat,duration,rest});
 assert.deepEqual(beamGroups([note(0,.5),note(.5,.5),note(1,.5),note(1.5,.5)]),[[0,1,2,3]]);
 assert.deepEqual(beamGroups([0,.25,.5,.75].map(b=>note(b,.25))),[[0,1,2,3]]);
 assert.deepEqual(beamGroups([note(0,.25),note(.25,.25,true),note(.5,.25),note(.75,.25)]),[[2,3]]);
 assert.deepEqual(beamGroups([note(0,.5),note(.5,.25),note(.75,.25)]),[[0,1,2]]);
 assert.deepEqual(beamGroups([note(0,1),note(1,.5),note(1.5,.5,true)]),[]);
 assert.deepEqual(beamGroups([note(0,.25),note(.5,.25)]),[]);
});

test('four eighths beam by half measure, never across beats 2–3 or rests',async()=>{
 const {beamGroups}=await import('../sight-reading/music.js');
 const notes=Array.from({length:8},(_,i)=>({beat:i*.5,duration:.5,rest:false}));
 assert.deepEqual(beamGroups(notes),[[0,1,2,3],[4,5,6,7]]);
 assert.deepEqual(beamGroups(notes.slice(2,6)),[[0,1],[2,3]]);
 assert.deepEqual(beamGroups(notes.slice(4)),[[0,1,2,3]]);
 assert.deepEqual(beamGroups(notes.slice(0,4).map((n,i)=>({...n,rest:i===1}))),[[2,3]]);
});
test('chromatic includes all semitones; range limits also bound optional accidentals',async()=>{
 const {readingPitches}=await import('../sight-reading/music.js');
 assert.deepEqual(readingPitches({scale:'chromatic',tonic:0,low:60,high:72}).map(n=>n.midi),Array.from({length:13},(_,i)=>60+i));
 assert.equal(keySignature({scale:'chromatic',tonic:0}).count,0);
 const random=seeded();
 for(const scale of ['major','minor','chromatic'])for(let tonic=0;tonic<12;tonic++)for(const [low,high]of [[48,84],[61,66],[78,80]]){
  const s={scale,tonic,low,high,subdivision:'sixteenth',leaps:'large',rests:'none',accidentals:true};
  if(!readingPitches(s).length)continue;
  for(let i=0;i<10;i++)for(const event of makeMeasure(s,32,random).events){assert(event.midi>=low&&event.midi<=high);assert.equal(event.midi,midiFromStep(event.step,event.accidental));}
 }
 assert.deepEqual(readingPitches({scale:'major',tonic:0,low:72,high:60}),[]);
 assert.throws(()=>makeMeasure({scale:'major',tonic:0,low:61,high:61,subdivision:'eighth',rests:'none'}));
 const single=makeMeasure({scale:'chromatic',tonic:0,low:61,high:61,subdivision:'eighth',rests:'none',leaps:'small'});assert(single.events.every(n=>n.midi===61));
});
test('adjacent rests consolidate at beat and half-measure boundaries',async()=>{
 const {consolidateRests}=await import('../sight-reading/music.js');const r=(beat,duration)=>({beat,duration,rest:true});
 assert.deepEqual(consolidateRests([r(0,.5),r(.5,.5)]).map(e=>[e.beat,e.duration]),[[0,1]]);
 assert.deepEqual(consolidateRests([r(2,1),r(3,1)]).map(e=>[e.beat,e.duration]),[[2,2]]);
 assert.deepEqual(consolidateRests([r(1,1),r(2,1)]).map(e=>[e.beat,e.duration]),[[1,1],[2,1]]);
 assert.deepEqual(consolidateRests([0,1,2,3].map(b=>r(b,1))).map(e=>[e.beat,e.duration]),[[0,4]]);
 assert.deepEqual(consolidateRests([r(.5,.5),r(1,.5)]).map(e=>[e.beat,e.duration]),[[.5,.5],[1,.5]]);
 assert.deepEqual(consolidateRests([r(0,.5),r(.5,.25)],true).map(e=>[e.beat,e.duration]),[[0,.75]]);
 const note={beat:.5,duration:.5,rest:false};assert.deepEqual(consolidateRests([r(0,.5),note,r(1,.5)]),[r(0,.5),note,r(1,.5)]);
});
test('dotted measures fill four beats, respect grid, and beam dotted-eighth patterns',async()=>{
 const {rhythmSymbol,beamGroups}=await import('../sight-reading/music.js');const random=seeded();let dottedQuarters=0,dottedEighths=0;
 for(const subdivision of ['eighth','sixteenth'])for(const rests of ['none','simple','complex'])for(let i=0;i<100;i++){
  const m=makeMeasure({scale:'major',tonic:0,subdivision,leaps:'small',rests,dotted:true},32,random);let beat=0;
  for(const e of m.events){assert.equal(e.beat,beat);beat+=e.duration;assert(e.beat* (subdivision==='eighth'?2:4)%1===0);if(!e.rest){if(e.duration===1.5)dottedQuarters++;if(e.duration===.75)dottedEighths++;}}
  assert.equal(beat,4);
 }
 assert(dottedQuarters>0);assert(dottedEighths>0);
 assert.deepEqual(rhythmSymbol(1.5),{base:1,dotted:true,flags:0});assert.deepEqual(rhythmSymbol(.75),{base:.5,dotted:true,flags:1});
 assert.deepEqual(beamGroups([{beat:0,duration:.75},{beat:.75,duration:.25}]),[[0,1]]);
});
