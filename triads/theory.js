export const qualities={major:[0,4,7],minor:[0,3,7],augmented:[0,4,8],diminished:[0,3,6]};
export function voiceTriad(root,quality,inversion=0){
 const notes=qualities[quality].map(interval=>root+interval);
 for(let i=0;i<inversion;i++)notes.push(notes.shift()+12);
 return notes;
}
export function candidates({low,high,inversions}){
 const result=[];
 for(const quality of Object.keys(qualities))for(const inversion of inversions?[0,1,2]:[0])for(let root=low-12;root<=high;root++){
  const notes=voiceTriad(root,quality,inversion);
  if(notes.every(n=>n>=low&&n<=high))result.push({quality,inversion,root,notes});
 }
 return result;
}
export function newQuestion(settings,previous=null,random=Math.random){
 const pool=candidates(settings);if(!pool.length)throw Error('Widen the range to fit a triad.');
 const pick=items=>items[Math.floor(random()*items.length)];
 const quality=pick([...new Set(pool.map(q=>q.quality))]);
 let choices=pool.filter(q=>q.quality===quality);
 const varied=choices.filter(q=>q.notes[0]%12!==previous?.notes[0]%12);if(varied.length)choices=varied;
 const inversion=pick([...new Set(choices.map(q=>q.inversion))]);
 const question={...pick(choices.filter(q=>q.inversion===inversion))};
 question.arpeggiated=settings.presentation==='mixed'?random()<.5:settings.presentation==='arpeggiated';
 question.askInversion=settings.inversions;question.askPresentation=settings.presentation==='mixed';return question;
}
export function grade(question,answer){
 const quality=answer.quality===question.quality;
 const expectedInversion=question.quality==='augmented'?'ambiguous':String(question.inversion);
 const inversion=!question.askInversion||answer.inversion===expectedInversion;
 const presentation=!question.askPresentation||answer.presentation===(question.arpeggiated?'arpeggiated':'block');
 return {quality,inversion,presentation,correct:quality&&inversion&&presentation,expectedInversion};
}
