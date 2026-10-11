import {mountPiano} from './app.js';
const dock=document.createElement('aside');dock.className='piano-dock';dock.setAttribute('aria-label','Reference piano');
dock.innerHTML='<div class="dock-bar"><span>◒ Reference piano <small>· A–&quot; to play</small></span><button id="dock-toggle" aria-expanded="false" aria-controls="dock-piano">Show piano</button></div><div id="dock-piano" hidden></div>';
document.body.append(dock);const panel=document.getElementById('dock-piano'),toggle=document.getElementById('dock-toggle');let mini;
function setOpen(open){if(!open)mini?.stop();panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Hide piano':'Show piano';document.body.classList.toggle('piano-open',open);if(open&&!mini)mini=mountPiano(panel,{compact:true,active:()=>!panel.hidden});try{localStorage.setItem('keyroom:piano-open',String(open));}catch{}}
toggle.onclick=()=>setOpen(panel.hidden);let open=false;try{open=localStorage.getItem('keyroom:piano-open')==='true';}catch{}setOpen(open);
const full=document.getElementById('full-piano');if(full){const instrument=mountPiano(full,{active:()=>panel.hidden});toggle.addEventListener('click',()=>instrument.stop());}
