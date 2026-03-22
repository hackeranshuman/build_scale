/* ── Cursor ── */
const cur = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
document.addEventListener('mousemove', e => {
  cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
  setTimeout(() => { ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; }, 60);
});
document.querySelectorAll('a, button, .tab-btn').forEach(el => {
  el.addEventListener('mouseenter', () => { cur.style.width='20px'; cur.style.height='20px'; ring.style.width='52px'; ring.style.height='52px'; });
  el.addEventListener('mouseleave', () => { cur.style.width='12px'; cur.style.height='12px'; ring.style.width='36px'; ring.style.height='36px'; });
});

/* ── Tab Switching ── */
const sidebarContent = {
  terms: [
    { label: 'Terms of Service', items: [
      { id: 'terms-1', text: '01 — Agreement' },
      { id: 'terms-2', text: '02 — Our Services' },
      { id: 'terms-3', text: '03 — Payment Terms' },
      { id: 'terms-4', text: '04 — Revisions' },
      { id: 'terms-5', text: '05 — Timelines' },
      { id: 'terms-6', text: '06 — Intellectual Property' },
      { id: 'terms-7', text: '07 — Warranties & Liability' },
      { id: 'terms-8', text: '08 — Termination' },
    ]}
  ],
  privacy: [
    { label: 'Privacy Policy', items: [
      { id: 'privacy-1', text: '01 — Overview' },
      { id: 'privacy-2', text: '02 — Data We Collect' },
      { id: 'privacy-3', text: '03 — How We Use It' },
      { id: 'privacy-4', text: '04 — Sharing Data' },
      { id: 'privacy-5', text: '05 — Your Rights' },
      { id: 'privacy-6', text: '06 — Retention' },
    ]}
  ],
  cookies: [
    { label: 'Cookie Policy', items: [
      { id: 'cookie-1', text: '01 — What Are Cookies' },
      { id: 'cookie-2', text: '02 — Cookies We Use' },
      { id: 'cookie-3', text: '03 — Managing Cookies' },
    ]}
  ],
  refunds: [
    { label: 'Refund Policy', items: [
      { id: 'refund-1', text: '01 — Overview' },
      { id: 'refund-2', text: '02 — Deposit Policy' },
      { id: 'refund-3', text: '03 — Mid-Project Cancellation' },
      { id: 'refund-4', text: '04 — Quality Issues' },
    ]}
  ]
};

function buildSidebar(tab) {
  const sidebar = document.getElementById('sidebar');
  const groups  = sidebarContent[tab];
  sidebar.innerHTML = groups.map(g => `
    <div class="sidebar-label">${g.label}</div>
    ${g.items.map((item, i) => `
      <a href="#${item.id}" class="sidebar-link${i === 0 ? ' active' : ''}" data-target="${item.id}"
         onclick="setSidebarActive(this)">${item.text}</a>
    `).join('')}
  `).join('');
}

function setSidebarActive(el) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  el.classList.add('active');
}

function switchTab(tab, btn) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Switch panels
  document.querySelectorAll('.legal-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  // Rebuild sidebar
  buildSidebar(tab);
  // Scroll to top of content
  window.scrollTo({ top: document.querySelector('.legal-body').offsetTop - 130, behavior: 'smooth' });
}

// Init sidebar
buildSidebar('terms');

/* ── Scroll spy for sidebar ── */
const scrollSpy = () => {
  const links = document.querySelectorAll('.sidebar-link[data-target]');
  let current = '';
  links.forEach(link => {
    const section = document.getElementById(link.dataset.target);
    if (section && section.getBoundingClientRect().top <= 180) {
      current = link.dataset.target;
    }
  });
  links.forEach(link => {
    link.classList.toggle('active', link.dataset.target === current);
  });
};
window.addEventListener('scroll', scrollSpy, { passive: true });

/* ── Back to top ── */
const backTop = document.getElementById('backTop');
window.addEventListener('scroll', () => {
  backTop.classList.toggle('show', window.scrollY > 400);
}, { passive: true });
