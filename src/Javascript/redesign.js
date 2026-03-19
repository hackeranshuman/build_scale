// Cursor
const c=document.getElementById('cursor'),r=document.getElementById('cursorRing');
document.addEventListener('mousemove',e=>{c.style.left=e.clientX+'px';c.style.top=e.clientY+'px';setTimeout(()=>{r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';},60);});
document.querySelectorAll('a,button').forEach(el=>{el.addEventListener('mouseenter',()=>{c.style.width='20px';c.style.height='20px';r.style.width='52px';r.style.height='52px';});el.addEventListener('mouseleave',()=>{c.style.width='12px';c.style.height='12px';r.style.width='36px';r.style.height='36px';});});
// Before/After slider
const visual=document.getElementById('baVisual');
const after=document.getElementById('baAfter');
const divider=document.getElementById('baDivider');
let dragging=false;
function updateSlider(x){const rect=visual.getBoundingClientRect();const pct=Math.min(Math.max((x-rect.left)/rect.width,0),1)*100;after.style.clipPath=`inset(0 ${100-pct}% 0 0)`;divider.style.left=pct+'%';}
visual.addEventListener('mousedown',e=>{dragging=true;updateSlider(e.clientX);});
document.addEventListener('mousemove',e=>{if(dragging)updateSlider(e.clientX);});
document.addEventListener('mouseup',()=>dragging=false);
visual.addEventListener('touchstart',e=>{dragging=true;updateSlider(e.touches[0].clientX);},{passive:true});
document.addEventListener('touchmove',e=>{if(dragging)updateSlider(e.touches[0].clientX);},{passive:true});
document.addEventListener('touchend',()=>dragging=false);
const obs=new IntersectionObserver(en=>{en.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:.1});
document.querySelectorAll('.fade-up').forEach(el=>obs.observe(el));