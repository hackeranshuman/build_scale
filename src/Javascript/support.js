/* ── Custom Cursor ── */
const cur = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
document.addEventListener('mousemove', e => {
  cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
  setTimeout(() => { ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; }, 60);
});
document.querySelectorAll('a, button, .qa-card, .article-item, .priority-opt, .pop-tag, .faq-item').forEach(el => {
  el.addEventListener('mouseenter', () => { cur.style.width = '20px'; cur.style.height = '20px'; ring.style.width = '52px'; ring.style.height = '52px'; });
  el.addEventListener('mouseleave', () => { cur.style.width = '12px'; cur.style.height = '12px'; ring.style.width = '36px'; ring.style.height = '36px'; });
});

/* ── Scroll Fade-in ── */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

/* ── Search ── */
const articles = [
  { title: 'How to complete your project brief form', tag: 'Getting Started' },
  { title: 'How and when you will be invoiced', tag: 'Billing' },
  { title: 'How many revisions are included in my plan?', tag: 'Revisions' },
  { title: 'How to connect your custom domain', tag: 'Domains' },
  { title: 'Setting up Google Analytics 4 on your site', tag: 'SEO' },
  { title: 'Resetting your password and 2FA setup', tag: 'Account' },
  { title: 'Understanding the 50/50 payment structure', tag: 'Billing' },
  { title: 'The onboarding checklist — what to prepare', tag: 'Getting Started' },
  { title: 'How to read and use your project timeline', tag: 'Project' },
  { title: 'Improving your Core Web Vitals score', tag: 'SEO' },
  { title: 'Deploying to Vercel, Netlify, or cPanel', tag: 'Domains' },
  { title: 'Updating images, text, and content yourself', tag: 'Revisions' },
];
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResults.classList.remove('show'); return; }
  const matches = articles.filter(a => a.title.toLowerCase().includes(q)).slice(0, 5);
  if (!matches.length) { searchResults.classList.remove('show'); return; }
  searchResults.innerHTML = matches.map(a =>
    `<div class="sr-item" onclick="searchResults.classList.remove('show')">
      <span>${a.title}</span>
      <span class="sr-tag">${a.tag}</span>
    </div>`
  ).join('');
  searchResults.classList.add('show');
});
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) searchResults.classList.remove('show');
});
function fillSearch(text) {
  searchInput.value = text;
  searchInput.dispatchEvent(new Event('input'));
  searchInput.focus();
}

/* ── Help Center Panels ── */
function switchPanel(btn) {
  document.querySelectorAll('.hc-cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const panel = btn.dataset.panel;
  document.querySelectorAll('.hc-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + panel).classList.add('active');
}

/* ── Ticket Priority ── */
function selectPriority(el, cls) {
  document.querySelectorAll('.priority-opt').forEach(o => {
    o.classList.remove('selected-low','selected-med','selected-high','selected-urgent');
  });
  el.classList.add(cls);
}

/* ── Ticket Submit ── */
function submitTicket() {
  document.getElementById('ticketForm').style.display = 'none';
  document.getElementById('ticketSuccess').classList.add('show');
}

/* ── FAQ Toggle ── */
function toggleFaq(item) {
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(f => f.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* ── FAQ Topic Filter ── */
function filterFaq(btn, topic) {
  document.querySelectorAll('.faq-topic-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.faq-item').forEach(item => {
    if (topic === 'all' || item.dataset.topic === topic) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
      item.classList.remove('open');
    }
  });
}

/* ── Uptime Bars ── */
(function buildUptimeBars() {
  const container = document.getElementById('uptimeBars');
  for (let i = 0; i < 90; i++) {
    const bar = document.createElement('div');
    bar.className = 'uc-bar';
    // Sprinkle a couple of minor incident days
    if (i === 23 || i === 61) bar.classList.add('incident');
    const h = 40 + Math.random() * 60;
    bar.style.height = h + '%';
    container.appendChild(bar);
  }
})();
