  const cursor = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursorRing');
  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
    setTimeout(() => { cursorRing.style.left = mx + 'px'; cursorRing.style.top = my + 'px'; }, 60);
  });
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => { cursor.style.width = '20px'; cursor.style.height = '20px'; cursorRing.style.width = '52px'; cursorRing.style.height = '52px'; });
    el.addEventListener('mouseleave', () => { cursor.style.width = '12px'; cursor.style.height = '12px'; cursorRing.style.width = '36px'; cursorRing.style.height = '36px'; });
  });
  const observer = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }); }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));