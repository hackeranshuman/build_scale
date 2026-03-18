const c=document.getElementById('cursor'),r=document.getElementById('cursorRing');
document.addEventListener('mousemove',e=>{c.style.left=e.clientX+'px';c.style.top=e.clientY+'px';setTimeout(()=>{r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';},60);});
document.querySelectorAll('a,button').forEach(el=>{el.addEventListener('mouseenter',()=>{c.style.width='20px';c.style.height='20px';r.style.width='52px';r.style.height='52px';});el.addEventListener('mouseleave',()=>{c.style.width='12px';c.style.height='12px';r.style.width='36px';r.style.height='36px';});});
const obs=new IntersectionObserver(en=>{en.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:.1});
document.querySelectorAll('.fade-up').forEach(el=>obs.observe(el));