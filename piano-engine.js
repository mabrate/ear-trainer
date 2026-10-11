/** Reusable MIDI-note sample player. No dependency on the piano UI. */
export class PianoEngine {
  constructor(){ this.voices=new Map(); this.buffers=[]; this.sustain=false; this.volume=.65; }
  async load(onProgress=()=>{}){
    if(this.loading)return this.loading;
    this.loading=this.loadSamples(onProgress).finally(()=>{this.loading=null;});
    return this.loading;
  }
  async loadSamples(onProgress=()=>{}){
    if(this.ready)return;
    this.context ||= new AudioContext({latencyHint:'interactive'});
    await this.context.resume();
    this.master ||= this.context.createGain();this.master.gain.value=this.volume*.45;this.master.connect(this.context.destination);
    const response=await fetch(new URL('./samples/piano.json',import.meta.url));if(!response.ok)throw Error('Sample manifest unavailable');
    const manifest=await response.json();let done=0;
    this.buffers=await Promise.all(manifest.samples.map(async sample=>{
      const r=await fetch(new URL(sample.url,import.meta.url));if(!r.ok)throw Error(`Missing sample: ${sample.url}`);
      const buffer=await this.context.decodeAudioData(await r.arrayBuffer());onProgress(++done,manifest.samples.length);
      return {...sample,buffer};
    }));this.ready=true;
  }
  setVolume(value){this.volume=value;if(this.master)this.master.gain.setTargetAtTime(value*.45,this.context.currentTime,.02);}
  noteOn(midi,velocity=.75,id=crypto.randomUUID(),when=this.context?.currentTime){
    if(!this.ready)return null;
    if(this.voices.has(id))this.release(id);
    this.context.resume();
    const sample=this.buffers.reduce((a,b)=>Math.abs(b.midi-midi)<Math.abs(a.midi-midi)?b:a);
    const source=this.context.createBufferSource(),gain=this.context.createGain();
    source.buffer=sample.buffer;source.playbackRate.value=2**((midi-sample.midi)/12);
    gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(velocity,when+.005);
    source.connect(gain);gain.connect(this.master);
    const voice={source,gain,midi,held:true};this.voices.set(id,voice);
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.voices.get(id)===voice)this.voices.delete(id);};
    source.start(when);return id;
  }
  noteOff(id){const v=this.voices.get(id);if(!v)return;v.held=false;if(!this.sustain)this.release(id);}
  release(id){const v=this.voices.get(id);if(!v)return;const t=this.context.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.065);v.source.stop(t+.4);this.voices.delete(id);}
  setSustain(on){this.sustain=on;if(!on)for(const [id,v] of this.voices)if(!v.held)this.release(id);}
  stopAll(){for(const id of this.voices.keys())this.release(id);}
  /** Audio-clock scheduling for simultaneous chords or evenly spaced arpeggios.
   * Exercise playback releases independently of the reference piano pedal. */
  playChord(notes,{arpeggiated=false,duration=1.5,gap=.3}={}){
    if(!this.ready)throw Error('Load the piano first');
    this.context.resume();
    const start=this.context.currentTime+.06,ids=[];
    notes.forEach((midi,i)=>{
      const when=start+(arpeggiated?i*gap:0),id=crypto.randomUUID();
      this.noteOn(midi,.7,id,when);const voice=this.voices.get(id);
      const end=when+duration;voice.gain.gain.setTargetAtTime(0,end,.065);voice.source.stop(end+.4);ids.push(id);
    });
    return ()=>ids.forEach(id=>this.release(id));
  }
  /** Quarter-note sequence with precise audio-clock onset and a short gap per beat. */
  playMelody(notes,{tempo=90}={}){
    if(!this.ready)throw Error('Load the piano first');
    if(!Number.isFinite(tempo)||tempo<40||tempo>200)throw Error('Tempo must be 40–200 BPM');
    this.context.resume();const beat=60/tempo,start=this.context.currentTime+.06,ids=[];
    notes.forEach((midi,i)=>{
      if(midi==null)return; // Empty answer slots retain their beat as silence.
      const when=start+i*beat,id=crypto.randomUUID();this.noteOn(midi,.7,id,when);
      const voice=this.voices.get(id),end=when+beat*.8;
      voice.gain.gain.setTargetAtTime(0,end,.015);voice.source.stop(end+Math.min(.1,beat*.2));ids.push(id);
    });
    return ()=>ids.forEach(id=>this.release(id));
  }
  /** Schedule a note for an ear-training exercise; returns a cancellable timer. */
  playNote(midi,{velocity=.75,duration=800}={}){const id=this.noteOn(midi,velocity);const timer=setTimeout(()=>this.noteOff(id),duration);return ()=>{clearTimeout(timer);this.release(id);};}
}
