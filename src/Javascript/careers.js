
/* ── Cursor ── */
const cur  = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
document.addEventListener('mousemove', e => {
  cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
  setTimeout(() => { ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; }, 60);
});
document.querySelectorAll('a, button, .role-card, .value-card, .perk-card, .filter-chip').forEach(el => {
  el.addEventListener('mouseenter', () => { cur.style.width='20px'; cur.style.height='20px'; ring.style.width='52px'; ring.style.height='52px'; });
  el.addEventListener('mouseleave', () => { cur.style.width='12px'; cur.style.height='12px'; ring.style.width='36px'; ring.style.height='36px'; });
});

/* ── Scroll Fade-in ── */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.07 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

/* ── Role Filtering ── */
function filterRoles(dept, btn) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');

  const cards = document.querySelectorAll('.role-card');
  let visible = 0;
  cards.forEach(card => {
    const match = dept === 'all' || card.dataset.dept === dept;
    card.classList.toggle('hidden', !match);
    if (match) visible++;
  });

  const noRoles = document.getElementById('noRoles');
  noRoles.classList.toggle('show', visible === 0);
}

/* ── File name display ── */
document.getElementById('resumeFile').addEventListener('change', function() {
  const fn = document.getElementById('fileName');
  fn.textContent = this.files[0] ? '📎 ' + this.files[0].name : '';
});

/* ── Application Submit ── */
function submitApplication() {
  const name      = document.getElementById('appName').value.trim();
  const email     = document.getElementById('appEmail').value.trim();
  const role      = document.getElementById('appRole').value;
  const portfolio = document.getElementById('appPortfolio').value.trim();
  const message   = document.getElementById('appMessage').value.trim();

  if (!name) { alert('Please enter your name.'); document.getElementById('appName').focus(); return; }
  if (!email || !/\S+@\S+\.\S+/.test(email)) { alert('Please enter a valid email.'); document.getElementById('appEmail').focus(); return; }
  if (!role) { alert('Please select the role you\'re applying for.'); return; }

  const btn = document.querySelector('.app-submit');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  // Simulate submission (replace with real API call if needed)
  setTimeout(() => {
    document.getElementById('appForm').style.display = 'none';
    document.getElementById('appSuccess').classList.add('show');

    // Log to console for backend wiring
    console.log('Application submitted:', { name, email, role, portfolio, message });
  }, 1000);
}

/* ── Back to top ── */
const backTop = document.getElementById('backTop');
window.addEventListener('scroll', () => {
  backTop.classList.toggle('show', window.scrollY > 500);
}, { passive: true });