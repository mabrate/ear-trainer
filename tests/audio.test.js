import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PianoEngine} from '../piano-engine.js';
class Param{value=0;events=[];setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}linearRampToValueAtTime(v,t){this.value=v;this.events.push(['ramp',v,t]);}setTargetAtTime(v,t){this.value=v;this.events.push(['target',v,t]);}cancelScheduledValues(t){this.events.push(['cancel',t]);}}
class Context{currentTime=10;destination={};sources=[];async resume(){}createGain(){return {gain:new Param(),connect(){},disconnect(){}};}createBufferSource(){const s={playbackRate:new Param(),connect(){},disconnect(){},start(t){this.startTime=t;},stop(t){this.stopTime=t;}};this.sources.push(s);return s;}async decodeAudioData(bytes){assert(bytes.byteLength>0);return {};}}
test('sample URLs are route independent; overlapping loads share one request',async()=>{
 globalThis.AudioContext=Context;let requests=0;globalThis.fetch=async url=>{requests++;assert(url instanceof URL);const bytes=await fs.readFile(url);return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes};};
 const e=new PianoEngine();await Promise.all([e.load(),e.load()]);assert.equal(requests,14);assert.equal(e.buffers.length,13);e.noteOn(60,.7,'root');assert.equal(e.context.sources.at(-1).playbackRate.value,1);e.noteOn(61,.7,'sharp');assert.equal(e.context.sources.at(-1).playbackRate.value,2**(1/12));
 e.setSustain(true);e.noteOff('root');assert.equal(e.voices.size,2);e.setSustain(false);assert.equal(e.voices.size,1);e.stopAll();assert.equal(e.voices.size,0);
 const cancel=e.playChord([60,64,67]);const block=e.context.sources.slice(-3);assert(block.every(s=>s.startTime===10.06));assert(block.every(s=>s.stopTime>11.5));cancel();assert.equal(e.voices.size,0);
 e.playChord([60,64,67],{arpeggiated:true});const arp=e.context.sources.slice(-3);assert(Math.abs(arp[1].startTime-arp[0].startTime-.3)<1e-9);assert(Math.abs(arp[2].startTime-arp[1].startTime-.3)<1e-9);e.stopAll();assert.equal(e.voices.size,0);
});
test('quarter-note sequences honor BPM, keep silent slots, and cancel scheduled notes',async()=>{
 const e=new PianoEngine();await e.load();const cancel=e.playMelody([60,null,64,67],{tempo:120});const sources=e.context.sources;
 assert.equal(sources.length,3);assert(Math.abs(sources[0].startTime-10.06)<1e-9);assert(Math.abs(sources[1].startTime-11.06)<1e-9);assert(Math.abs(sources[2].startTime-11.56)<1e-9);
 assert(sources.every(s=>Math.abs(s.stopTime-s.startTime-.5)<1e-9));cancel();assert.equal(e.voices.size,0);
 assert.throws(()=>e.playMelody([60],{tempo:0}));assert.throws(()=>e.playMelody([60],{tempo:201}));
});
