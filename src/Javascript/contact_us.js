  // Cursor
  const cursor = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursorRing');
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
    setTimeout(() => { cursorRing.style.left = e.clientX + 'px'; cursorRing.style.top = e.clientY + 'px'; }, 60);
  });
  document.querySelectorAll('a, button, .service-option, .budget-option, .faq-item').forEach(el => {
    el.addEventListener('mouseenter', () => { cursor.style.width = '20px'; cursor.style.height = '20px'; cursorRing.style.width = '52px'; cursorRing.style.height = '52px'; });
    el.addEventListener('mouseleave', () => { cursor.style.width = '12px'; cursor.style.height = '12px'; cursorRing.style.width = '36px'; cursorRing.style.height = '36px'; });
  });

  // Multi-step form
  let currentStep = 1;
  function goTo(step) {
    document.getElementById('step' + currentStep).classList.remove('active');
    document.getElementById('dot' + currentStep).classList.remove('active');
    document.getElementById('dot' + currentStep).classList.add('done');
    currentStep = step;
    document.getElementById('step' + currentStep).classList.add('active');
    document.getElementById('dot' + currentStep).classList.remove('done');
    document.getElementById('dot' + currentStep).classList.add('active');
  }
  function submitForm() {
    document.getElementById('step3').classList.remove('active');
    ['dot1','dot2','dot3'].forEach(id => { document.getElementById(id).classList.remove('active'); document.getElementById(id).classList.add('done'); });
    document.getElementById('formSuccess').classList.add('show');
  }
  function toggleService(el) { el.classList.toggle('selected'); }
  function selectBudget(el) {
    document.querySelectorAll('.budget-option').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
  }

  // FAQ
  function toggleFaq(item) {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(f => f.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  }

  // Scroll fade
  const observer = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }); }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
