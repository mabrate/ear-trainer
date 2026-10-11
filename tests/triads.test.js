import test from 'node:test';
import assert from 'node:assert/strict';
import {qualities,voiceTriad,candidates,newQuestion,grade} from '../triads/theory.js';
test('voicings put the root, third, and fifth in the bass',()=>{
 assert.deepEqual(voiceTriad(60,'major',0),[60,64,67]);assert.deepEqual(voiceTriad(60,'major',1),[64,67,72]);assert.deepEqual(voiceTriad(60,'major',2),[67,72,76]);
 assert.deepEqual(voiceTriad(60,'minor'),[60,63,67]);assert.deepEqual(voiceTriad(60,'augmented'),[60,64,68]);assert.deepEqual(voiceTriad(60,'diminished'),[60,63,66]);
});
test('even narrow valid ranges contain every quality and inversion within bounds',()=>{
 for(let low=36;low<=87;low++){const pool=candidates({low,high:low+9,inversions:true});for(const quality of Object.keys(qualities))for(const inversion of [0,1,2])assert(pool.some(q=>q.quality===quality&&q.inversion===inversion));assert(pool.every(q=>q.notes.every(n=>n>=low&&n<=low+9)));}
});
test('question pitches vary and disabled inversions stay in root position',()=>{
 let previous;for(let i=0;i<200;i++){const q=newQuestion({low:48,high:77,inversions:false,presentation:'block'},previous);assert.equal(q.inversion,0);assert.equal(q.arpeggiated,false);if(previous)assert.notEqual(q.notes[0]%12,previous.notes[0]%12);previous=q;}
});
test('mixed and arpeggiated modes choose the right presentation',()=>{
 const s={low:48,high:77,inversions:true,presentation:'mixed'};assert(newQuestion(s,null,()=>0).arpeggiated);assert(!newQuestion(s,null,()=>.99).arpeggiated);assert(newQuestion({...s,presentation:'arpeggiated'}).arpeggiated);
});
test('grading checks required dimensions and treats augmented inversions as ambiguous',()=>{
 const q={quality:'minor',inversion:1,arpeggiated:true,askInversion:true,askPresentation:true};assert(grade(q,{quality:'minor',inversion:'1',presentation:'arpeggiated'}).correct);assert(!grade(q,{quality:'minor',inversion:'0',presentation:'arpeggiated'}).correct);assert(!grade(q,{quality:'minor',inversion:'1',presentation:'block'}).correct);assert(grade({...q,quality:'augmented'},{quality:'augmented',inversion:'ambiguous',presentation:'arpeggiated'}).correct);assert(!grade({...q,quality:'augmented'},{quality:'augmented',inversion:'1',presentation:'arpeggiated'}).correct);assert(grade({...q,askInversion:false,askPresentation:false},{quality:'minor'}).correct);
});
