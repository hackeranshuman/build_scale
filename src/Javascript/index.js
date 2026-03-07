  // Custom cursor
  const cursor = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursorRing');
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    setTimeout(() => {
      cursorRing.style.left = e.clientX + 'px';
      cursorRing.style.top = e.clientY + 'px';
    }, 60);
  });
  document.querySelectorAll('a, button, .service-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width = '20px'; cursor.style.height = '20px';
      cursorRing.style.width = '52px'; cursorRing.style.height = '52px';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width = '12px'; cursor.style.height = '12px';
      cursorRing.style.width = '36px'; cursorRing.style.height = '36px';
    });
  });

  // Fade-in on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
