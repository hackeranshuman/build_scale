/*
  ============================================================
  BUILDSCALE — Support Ticket Backend
  ============================================================
  Routes:
    POST /api/tickets          → Submit a new ticket
    GET  /api/tickets          → Get all tickets (admin)
    GET  /api/tickets/:id      → Get single ticket
    PATCH /api/tickets/:id     → Update ticket status/notes
    DELETE /api/tickets/:id    → Delete a ticket
    GET  /api/stats            → Dashboard stats
    GET  /admin                → Admin dashboard HTML
  ============================================================
*/

const express    = require('express');
const cors       = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs         = require('fs');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
// Allow requests from any origin — including file:// (when support.html is opened directly)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the support HTML file statically
app.use(express.static(path.join(__dirname, 'public')));

// ── Simple JSON File Database ───────────────────────────────
const DB_FILE = path.join(__dirname, 'tickets.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ tickets: [], enquiries: [] }, null, 2));
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.enquiries) data.enquiries = []; // migrate old DB
  return data;
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── Helper: generate ticket number ─────────────────────────
function generateTicketNumber() {
  const year = new Date().getFullYear();
  const db   = readDB();
  const num  = String(db.tickets.length + 1).padStart(4, '0');
  return `BS-${year}-${num}`;
}

// ── Helper: generate enquiry number ───────────────────────
function generateEnquiryNumber() {
  const year = new Date().getFullYear();
  const db   = readDB();
  const num  = String(db.enquiries.length + 1).padStart(4, '0');
  return `ENQ-${year}-${num}`;
}

// ── Helper: priority sort order ────────────────────────────
const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

// ══════════════════════════════════════════════════════════
//  API ROUTES
// ══════════════════════════════════════════════════════════

// ── POST /api/tickets — Submit new ticket ──────────────────
app.post('/api/tickets', (req, res) => {
  const {
    name, email, subject, category, plan,
    priority, message, source
  } = req.body;

  // Validation
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and message are required.'
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address.'
    });
  }

  const ticket = {
    id:           uuidv4(),
    ticketNumber: generateTicketNumber(),
    name:         name.trim(),
    email:        email.trim().toLowerCase(),
    subject:      subject?.trim() || 'No subject',
    category:     category || 'General question',
    plan:         plan || 'Unknown',
    priority:     priority || 'medium',
    message:      message.trim(),
    status:       'open',          // open | in-progress | resolved | closed
    adminNotes:   '',
    source:       source || 'website',
    submittedAt:  new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
    resolvedAt:   null,
  };

  const db = readDB();
  db.tickets.unshift(ticket); // newest first
  writeDB(db);

  console.log(`\n🎫 NEW TICKET: ${ticket.ticketNumber}`);
  console.log(`   From:     ${ticket.name} <${ticket.email}>`);
  console.log(`   Subject:  ${ticket.subject}`);
  console.log(`   Priority: ${ticket.priority.toUpperCase()}`);
  console.log(`   Category: ${ticket.category}\n`);

  res.status(201).json({
    success:      true,
    ticketNumber: ticket.ticketNumber,
    message:      'Ticket submitted successfully. We\'ll be in touch soon!',
    ticket:       ticket
  });
});

// ── GET /api/tickets — Get all tickets ─────────────────────
app.get('/api/tickets', (req, res) => {
  const db = readDB();
  let tickets = [...db.tickets];

  // Filters
  const { status, priority, category, search } = req.query;
  if (status)   tickets = tickets.filter(t => t.status === status);
  if (priority) tickets = tickets.filter(t => t.priority === priority);
  if (category) tickets = tickets.filter(t => t.category === category);
  if (search) {
    const q = search.toLowerCase();
    tickets = tickets.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q) ||
      t.ticketNumber.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: tickets.length, tickets });
});

// ── GET /api/tickets/:id — Get single ticket ───────────────
app.get('/api/tickets/:id', (req, res) => {
  const db     = readDB();
  const ticket = db.tickets.find(t => t.id === req.params.id || t.ticketNumber === req.params.id);
  if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });
  res.json({ success: true, ticket });
});

// ── PATCH /api/tickets/:id — Update ticket ─────────────────
app.patch('/api/tickets/:id', (req, res) => {
  const db  = readDB();
  const idx = db.tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Ticket not found.' });

  const allowed = ['status', 'priority', 'adminNotes', 'category'];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) {
      db.tickets[idx][field] = req.body[field];
    }
  });

  db.tickets[idx].updatedAt = new Date().toISOString();
  if (req.body.status === 'resolved' || req.body.status === 'closed') {
    db.tickets[idx].resolvedAt = new Date().toISOString();
  }

  writeDB(db);
  res.json({ success: true, ticket: db.tickets[idx] });
});

// ── DELETE /api/tickets/:id — Delete ticket ────────────────
app.delete('/api/tickets/:id', (req, res) => {
  const db  = readDB();
  const idx = db.tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Ticket not found.' });
  const [removed] = db.tickets.splice(idx, 1);
  writeDB(db);
  res.json({ success: true, message: `Ticket ${removed.ticketNumber} deleted.` });
});

// ── GET /api/stats — Dashboard stats ──────────────────────
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const t  = db.tickets;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const stats = {
    total:       t.length,
    open:        t.filter(x => x.status === 'open').length,
    inProgress:  t.filter(x => x.status === 'in-progress').length,
    resolved:    t.filter(x => x.status === 'resolved').length,
    closed:      t.filter(x => x.status === 'closed').length,
    urgent:      t.filter(x => x.priority === 'urgent').length,
    high:        t.filter(x => x.priority === 'high').length,
    today:       t.filter(x => x.submittedAt.slice(0, 10) === todayStr).length,
    byCategory:  {},
    last7Days:   [],
  };

  // By category
  t.forEach(ticket => {
    stats.byCategory[ticket.category] = (stats.byCategory[ticket.category] || 0) + 1;
  });

  // Last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    stats.last7Days.push({
      date:  dayStr,
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      count: t.filter(x => x.submittedAt.slice(0, 10) === dayStr).length,
    });
  }

  // Enquiry stats
  const e = db.enquiries;
  stats.enquiries = {
    total:     e.length,
    new_:      e.filter(x => x.status === 'new').length,
    contacted: e.filter(x => x.status === 'contacted').length,
    converted: e.filter(x => x.status === 'converted').length,
    today:     e.filter(x => x.submittedAt.slice(0, 10) === todayStr).length,
  };

  res.json({ success: true, stats });
});


// ══════════════════════════════════════════════════════════
//  ENQUIRY ROUTES  (from Contact Us page)
// ══════════════════════════════════════════════════════════

// ── POST /api/enquiries — Submit new enquiry ───────────────
app.post('/api/enquiries', (req, res) => {
  const { firstName, lastName, email, company, phone,
          services, budget, description, timeline, heardFrom } = req.body;

  const name = `${(firstName||'').trim()} ${(lastName||'').trim()}`.trim();

  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
  }

  const enquiry = {
    id:             uuidv4(),
    enquiryNumber:  generateEnquiryNumber(),
    firstName:      (firstName||'').trim(),
    lastName:       (lastName||'').trim(),
    name,
    email:          email.trim().toLowerCase(),
    company:        (company||'').trim(),
    phone:          (phone||'').trim(),
    services:       services || [],
    budget:         budget || 'Not specified',
    description:    (description||'').trim(),
    timeline:       timeline || 'Not specified',
    heardFrom:      heardFrom || 'Not specified',
    status:         'new',       // new | contacted | in-progress | converted | closed
    adminNotes:     '',
    submittedAt:    new Date().toISOString(),
    updatedAt:      new Date().toISOString(),
  };

  const db = readDB();
  db.enquiries.unshift(enquiry);
  writeDB(db);

  console.log(`\n📬 NEW ENQUIRY: ${enquiry.enquiryNumber}`);
  console.log(`   From:     ${enquiry.name} <${enquiry.email}>`);
  console.log(`   Company:  ${enquiry.company || 'N/A'}`);
  console.log(`   Budget:   ${enquiry.budget}`);
  console.log(`   Services: ${(enquiry.services||[]).join(', ')||'None selected'}\n`);

  res.status(201).json({
    success:       true,
    enquiryNumber: enquiry.enquiryNumber,
    message:       "We've received your enquiry and will be in touch within 24 hours!",
    enquiry,
  });
});

// ── GET /api/enquiries — Get all enquiries ─────────────────
app.get('/api/enquiries', (req, res) => {
  const db = readDB();
  let enquiries = [...db.enquiries];

  const { status, search } = req.query;
  if (status) enquiries = enquiries.filter(e => e.status === status);
  if (search) {
    const q = search.toLowerCase();
    enquiries = enquiries.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.company.toLowerCase().includes(q) ||
      e.enquiryNumber.toLowerCase().includes(q) ||
      (e.description||'').toLowerCase().includes(q)
    );
  }
  res.json({ success: true, count: enquiries.length, enquiries });
});

// ── GET /api/enquiries/:id — Single enquiry ─────────────────
app.get('/api/enquiries/:id', (req, res) => {
  const db = readDB();
  const e  = db.enquiries.find(x => x.id === req.params.id || x.enquiryNumber === req.params.id);
  if (!e) return res.status(404).json({ success: false, error: 'Enquiry not found.' });
  res.json({ success: true, enquiry: e });
});

// ── PATCH /api/enquiries/:id — Update enquiry ──────────────
app.patch('/api/enquiries/:id', (req, res) => {
  const db  = readDB();
  const idx = db.enquiries.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Enquiry not found.' });
  ['status', 'adminNotes'].forEach(f => {
    if (req.body[f] !== undefined) db.enquiries[idx][f] = req.body[f];
  });
  db.enquiries[idx].updatedAt = new Date().toISOString();
  writeDB(db);
  res.json({ success: true, enquiry: db.enquiries[idx] });
});

// ── DELETE /api/enquiries/:id — Delete enquiry ─────────────
app.delete('/api/enquiries/:id', (req, res) => {
  const db  = readDB();
  const idx = db.enquiries.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Enquiry not found.' });
  const [removed] = db.enquiries.splice(idx, 1);
  writeDB(db);
  res.json({ success: true, message: `Enquiry ${removed.enquiryNumber} deleted.` });
});

// ══════════════════════════════════════════════════════════
//  ADMIN DASHBOARD (served as HTML)
// ══════════════════════════════════════════════════════════
app.get('/admin', (req, res) => {
  res.send(getAdminHTML());
});

// ── Start server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   BuildScale Support Backend — RUNNING   ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log(`║  Server:  http://localhost:${PORT}           ║`);
  console.log(`║  API:     http://localhost:${PORT}/api/tickets║`);
  console.log(`║  Admin:   http://localhost:${PORT}/admin      ║`);
  console.log('╚═══════════════════════════════════════════╝\n');
});

// ══════════════════════════════════════════════════════════
//  ADMIN DASHBOARD HTML (inline — no extra files needed)
// ══════════════════════════════════════════════════════════
function getAdminHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin — BuildScale Support</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root {
  --ink:#0a0a0f; --paper:#f5f3ee; --accent:#ff4d1c;
  --muted:#8a8780; --border:rgba(10,10,15,0.1);
  --open:#0891b2; --progress:#f59e0b; --resolved:#22c55e; --closed:#8a8780;
  --urgent:#dc2626; --high:#f97316; --medium:#0891b2; --low:#22c55e;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',sans-serif;background:#0d0d14;color:var(--paper);min-height:100vh;}

/* Layout */
.shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}

/* Sidebar */
.sidebar{background:#060608;border-right:1px solid rgba(255,255,255,.06);padding:1.5rem;position:sticky;top:0;height:100vh;overflow-y:auto;display:flex;flex-direction:column;}
.sidebar-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:1.2rem;letter-spacing:-.04em;color:var(--paper);margin-bottom:2rem;}
.sidebar-logo span{color:var(--accent);}
.sidebar-label{font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:.6rem;margin-top:1.5rem;}
.sidebar-link{display:flex;align-items:center;gap:.7rem;padding:.65rem .8rem;border-radius:2px;font-size:.85rem;color:rgba(255,255,255,.45);cursor:pointer;transition:all .2s;margin-bottom:2px;border:none;background:transparent;width:100%;text-align:left;}
.sidebar-link:hover{background:rgba(255,255,255,.05);color:var(--paper);}
.sidebar-link.active{background:rgba(255,255,255,.08);color:var(--paper);font-weight:500;}
.sidebar-link .badge{margin-left:auto;background:var(--accent);color:white;font-size:.6rem;font-weight:700;padding:.15rem .45rem;border-radius:8px;min-width:18px;text-align:center;}
.sidebar-link .badge.urgent{background:var(--urgent);}
.sidebar-footer{margin-top:auto;padding-top:1rem;border-top:1px solid rgba(255,255,255,.06);font-size:.75rem;color:rgba(255,255,255,.2);}

/* Main */
.main{padding:2rem;overflow-y:auto;}
.page{display:none;}.page.active{display:block;animation:fadeIn .2s ease-out;}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

/* Top bar */
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;}
.topbar h1{font-family:'Syne',sans-serif;font-weight:800;font-size:1.6rem;letter-spacing:-.04em;}
.topbar-actions{display:flex;gap:.6rem;align-items:center;}
.btn{padding:.55rem 1.1rem;border-radius:2px;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:500;cursor:pointer;border:none;transition:all .2s;}
.btn-primary{background:var(--accent);color:white;}.btn-primary:hover{background:#e03d0d;}
.btn-ghost{background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);}.btn-ghost:hover{background:rgba(255,255,255,.1);color:var(--paper);}
.search-box{padding:.55rem 1rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:2px;font-family:'DM Sans',sans-serif;font-size:.85rem;color:var(--paper);outline:none;min-width:220px;}
.search-box:focus{border-color:rgba(255,255,255,.2);}
.search-box::placeholder{color:rgba(255,255,255,.25);}

/* Stat cards */
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem;}
.stat-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:2px;padding:1.4rem;position:relative;overflow:hidden;}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;}
.stat-card.c-open::before{background:var(--open);}
.stat-card.c-progress::before{background:var(--progress);}
.stat-card.c-resolved::before{background:var(--resolved);}
.stat-card.c-urgent::before{background:var(--urgent);}
.stat-val{font-family:'Syne',sans-serif;font-weight:800;font-size:2.2rem;letter-spacing:-.05em;line-height:1;}
.stat-card.c-open .stat-val{color:var(--open);}
.stat-card.c-progress .stat-val{color:var(--progress);}
.stat-card.c-resolved .stat-val{color:var(--resolved);}
.stat-card.c-urgent .stat-val{color:var(--urgent);}
.stat-label{font-size:.75rem;color:rgba(255,255,255,.35);margin-top:.4rem;}
.stat-sub{font-size:.7rem;color:rgba(255,255,255,.2);margin-top:.2rem;}

/* Chart */
.chart-bar-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem;}
.chart-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:2px;padding:1.5rem;}
.chart-title{font-family:'Syne',sans-serif;font-weight:700;font-size:.85rem;margin-bottom:1.2rem;letter-spacing:-.02em;}
.bar-chart{display:flex;align-items:flex-end;gap:6px;height:80px;}
.bc-bar{flex:1;border-radius:2px 2px 0 0;background:rgba(255,255,255,.1);position:relative;transition:background .2s;cursor:default;min-width:0;}
.bc-bar:hover{background:var(--accent);}
.bc-bar .bc-tip{position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);background:#1a1a22;color:var(--paper);font-size:.6rem;padding:.2rem .4rem;border-radius:1px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;}
.bc-bar:hover .bc-tip{opacity:1;}
.bc-labels{display:flex;gap:6px;margin-top:.4rem;}
.bc-label{flex:1;text-align:center;font-size:.6rem;color:rgba(255,255,255,.25);min-width:0;overflow:hidden;}

/* Category list */
.cat-list{display:flex;flex-direction:column;gap:.5rem;}
.cat-row{display:flex;align-items:center;gap:.8rem;}
.cat-name{font-size:.8rem;color:rgba(255,255,255,.55);min-width:140px;font-weight:300;}
.cat-bar-wrap{flex:1;height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;}
.cat-bar-fill{height:100%;background:var(--accent);border-radius:3px;transition:width .5s ease;}
.cat-count{font-size:.75rem;color:rgba(255,255,255,.3);min-width:24px;text-align:right;}

/* Filters */
.filters{display:flex;gap:.5rem;margin-bottom:1.2rem;flex-wrap:wrap;}
.filter-btn{padding:.4rem .9rem;border-radius:1px;font-size:.75rem;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.45);transition:all .2s;}
.filter-btn:hover{border-color:rgba(255,255,255,.25);color:var(--paper);}
.filter-btn.active{background:var(--accent);border-color:var(--accent);color:white;}

/* Ticket table */
.table-wrap{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:2px;overflow:hidden;}
.table-header{display:grid;grid-template-columns:110px 1fr 130px 80px 90px 100px 90px;gap:0;padding:.8rem 1.2rem;border-bottom:1px solid rgba(255,255,255,.07);font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.25);}
.ticket-row{display:grid;grid-template-columns:110px 1fr 130px 80px 90px 100px 90px;gap:0;padding:1rem 1.2rem;border-bottom:1px solid rgba(255,255,255,.05);align-items:center;cursor:pointer;transition:background .15s;}
.ticket-row:last-child{border-bottom:none;}
.ticket-row:hover{background:rgba(255,255,255,.04);}
.ticket-num{font-family:'Syne',sans-serif;font-weight:700;font-size:.78rem;color:rgba(255,255,255,.5);}
.ticket-subject{font-size:.85rem;color:var(--paper);font-weight:400;}
.ticket-name{font-size:.78rem;color:rgba(255,255,255,.45);font-weight:300;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ticket-email-sm{font-size:.68rem;color:rgba(255,255,255,.25);margin-top:.1rem;}
.badge{display:inline-flex;align-items:center;font-size:.6rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.2rem .55rem;border-radius:1px;}
.badge-open{background:rgba(8,145,178,.15);color:var(--open);}
.badge-progress{background:rgba(245,158,11,.15);color:var(--progress);}
.badge-resolved{background:rgba(34,197,94,.12);color:var(--resolved);}
.badge-closed{background:rgba(138,135,128,.12);color:var(--muted);}
.badge-urgent{background:rgba(220,38,38,.15);color:var(--urgent);}
.badge-high{background:rgba(249,115,22,.15);color:var(--high);}
.badge-medium{background:rgba(8,145,178,.12);color:var(--medium);}
.badge-low{background:rgba(34,197,94,.12);color:var(--low);}
.ticket-date{font-size:.72rem;color:rgba(255,255,255,.3);font-weight:300;}
.row-actions{display:flex;gap:.4rem;}
.row-btn{padding:.3rem .6rem;border-radius:1px;font-size:.65rem;font-weight:600;cursor:pointer;border:none;transition:all .2s;}
.row-btn-view{background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);}.row-btn-view:hover{background:rgba(255,255,255,.12);color:var(--paper);}
.row-btn-del{background:rgba(220,38,38,.1);color:var(--urgent);}.row-btn-del:hover{background:rgba(220,38,38,.25);}
.empty-state{text-align:center;padding:4rem;color:rgba(255,255,255,.2);}
.empty-state .icon{font-size:3rem;margin-bottom:1rem;}

/* Ticket detail modal */
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:none;align-items:flex-start;justify-content:center;padding:3rem 2rem;overflow-y:auto;}
.modal-backdrop.open{display:flex;animation:fadeIn .2s;}
.modal{background:#111118;border:1px solid rgba(255,255,255,.1);border-radius:4px;width:100%;max-width:680px;overflow:hidden;}
.modal-header{padding:1.5rem;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:1rem;}
.modal-header h2{font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;letter-spacing:-.03em;flex:1;}
.modal-close{background:rgba(255,255,255,.06);border:none;color:rgba(255,255,255,.5);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:.9rem;transition:all .2s;}
.modal-close:hover{background:rgba(255,255,255,.12);color:var(--paper);}
.modal-body{padding:1.5rem;display:flex;flex-direction:column;gap:1.2rem;}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;}
.detail-item{background:rgba(255,255,255,.04);border-radius:2px;padding:.9rem 1rem;}
.detail-label{font-size:.6rem;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:.3rem;}
.detail-value{font-size:.875rem;color:var(--paper);font-weight:400;}
.detail-message{background:rgba(255,255,255,.04);border-radius:2px;padding:1rem;}
.detail-message pre{font-family:'DM Sans',sans-serif;font-size:.875rem;color:rgba(255,255,255,.7);white-space:pre-wrap;line-height:1.6;font-weight:300;}
.modal-actions{padding:1.2rem 1.5rem;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:.6rem;flex-wrap:wrap;}
.status-select,.notes-input{width:100%;padding:.7rem 1rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:2px;font-family:'DM Sans',sans-serif;font-size:.875rem;color:var(--paper);outline:none;transition:border-color .2s;}
.status-select:focus,.notes-input:focus{border-color:rgba(255,255,255,.25);}
.status-select option{background:#111118;}
.notes-input{resize:vertical;min-height:80px;}
.form-label{font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:.4rem;display:block;}

/* Toast */
.toast{position:fixed;bottom:1.5rem;right:1.5rem;background:#1a2a1a;border:1px solid rgba(34,197,94,.3);border-radius:2px;padding:.9rem 1.4rem;font-size:.85rem;color:var(--paper);z-index:300;display:none;align-items:center;gap:.6rem;}
.toast.show{display:flex;animation:toastIn .3s ease-out;}
.toast.error{background:#2a1a1a;border-color:rgba(220,38,38,.3);}
@keyframes toastIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

/* Responsive */
@media(max-width:900px){
  .shell{grid-template-columns:1fr;}
  .sidebar{display:none;}
  .stats-row{grid-template-columns:1fr 1fr;}
  .chart-bar-row{grid-template-columns:1fr;}
  .table-header{display:none;}
  .ticket-row{grid-template-columns:1fr;gap:.4rem;padding:.8rem;}
}
</style>
</head>
<body>

<div class="shell">
  <!-- ── SIDEBAR ── -->
  <aside class="sidebar">
    <div class="sidebar-logo">Build<span>Scale</span> <span style="font-size:.7rem;color:rgba(255,255,255,.25);font-family:'DM Sans';font-weight:300;">Admin</span></div>

    <div class="sidebar-label">Overview</div>
    <button class="sidebar-link active" onclick="showPage('dashboard')">📊 Dashboard</button>
    <button class="sidebar-link" onclick="showPage('tickets')">🎫 All Tickets <span class="badge" id="sidebarOpenCount">—</span></button>

    <div class="sidebar-label">Filter by Status</div>
    <button class="sidebar-link" onclick="showPage('tickets');filterTickets('open')">🔵 Open</button>
    <button class="sidebar-link" onclick="showPage('tickets');filterTickets('in-progress')">🟡 In Progress</button>
    <button class="sidebar-link" onclick="showPage('tickets');filterTickets('resolved')">🟢 Resolved</button>
    <button class="sidebar-link" onclick="showPage('tickets');filterTickets('closed')">⚫ Closed</button>

    <div class="sidebar-label">Enquiries</div>
    <button class="sidebar-link" onclick="showPage('enquiries')">📬 All Enquiries <span class="badge" id="sidebarEnqCount">—</span></button>
    <button class="sidebar-link" onclick="showPage('enquiries');filterEnquiries('new')">🆕 New</button>
    <button class="sidebar-link" onclick="showPage('enquiries');filterEnquiries('contacted')">📞 Contacted</button>
    <button class="sidebar-link" onclick="showPage('enquiries');filterEnquiries('converted')">✅ Converted</button>

    <div class="sidebar-label">Filter by Priority</div>
    <button class="sidebar-link" onclick="showPage('tickets');filterByPriority('urgent')">🔴 Urgent <span class="badge urgent" id="sidebarUrgentCount">—</span></button>
    <button class="sidebar-link" onclick="showPage('tickets');filterByPriority('high')">🟠 High</button>

    <div class="sidebar-footer">BuildScale Support v1.0<br>© 2026 BuildScale</div>
  </aside>

  <!-- ── MAIN ── -->
  <main class="main">

    <!-- DASHBOARD PAGE -->
    <div class="page active" id="page-dashboard">
      <div class="topbar">
        <h1>Dashboard</h1>
        <div class="topbar-actions">
          <button class="btn btn-ghost" onclick="loadAll()">↻ Refresh</button>
        </div>
      </div>

      <div class="stats-row" style="grid-template-columns:repeat(5,1fr)">
        <div class="stat-card" style="--c:#f59e0b" >
          <div class="stat-val" id="statEnqTotal" style="color:#f59e0b">—</div>
          <div class="stat-label">New Enquiries</div>
          <div class="stat-sub">From Contact page</div>
        </div>
        <div class="stat-card c-open">
          <div class="stat-val" id="statOpen">—</div>
          <div class="stat-label">Open Tickets</div>
          <div class="stat-sub">Awaiting response</div>
        </div>
        <div class="stat-card c-progress">
          <div class="stat-val" id="statProgress">—</div>
          <div class="stat-label">In Progress</div>
          <div class="stat-sub">Being worked on</div>
        </div>
        <div class="stat-card c-resolved">
          <div class="stat-val" id="statResolved">—</div>
          <div class="stat-label">Resolved</div>
          <div class="stat-sub">All time</div>
        </div>
        <div class="stat-card c-urgent">
          <div class="stat-val" id="statUrgent">—</div>
          <div class="stat-label">Urgent</div>
          <div class="stat-sub">Need immediate attention</div>
        </div>
      </div>

      <div class="chart-bar-row">
        <div class="chart-card">
          <div class="chart-title">📈 Tickets — Last 7 Days</div>
          <div class="bar-chart" id="barChart"></div>
          <div class="bc-labels" id="barLabels"></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">📂 Tickets by Category</div>
          <div class="cat-list" id="catList"></div>
        </div>
      </div>

      <!-- Recent tickets preview -->
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem;margin-bottom:1rem;letter-spacing:-.02em;">🕐 Recent Tickets</div>
      <div class="table-wrap">
        <div class="table-header"><span>Ticket #</span><span>Subject</span><span>From</span><span>Priority</span><span>Status</span><span>Date</span><span>Actions</span></div>
        <div id="recentTickets"></div>
      </div>
    </div>

    <!-- TICKETS PAGE -->
    <div class="page" id="page-tickets">
      <div class="topbar">
        <h1>All Tickets</h1>
        <div class="topbar-actions">
          <input type="text" class="search-box" id="searchBox" placeholder="Search tickets…" oninput="handleSearch()">
          <button class="btn btn-ghost" onclick="loadAll()">↻ Refresh</button>
          <button class="btn btn-primary" onclick="exportCSV()">⬇ Export CSV</button>
        </div>
      </div>

      <div class="filters" id="statusFilters">
        <button class="filter-btn active" onclick="filterTickets('all',this)">All</button>
        <button class="filter-btn" onclick="filterTickets('open',this)">🔵 Open</button>
        <button class="filter-btn" onclick="filterTickets('in-progress',this)">🟡 In Progress</button>
        <button class="filter-btn" onclick="filterTickets('resolved',this)">🟢 Resolved</button>
        <button class="filter-btn" onclick="filterTickets('closed',this)">⚫ Closed</button>
      </div>

      <div class="table-wrap">
        <div class="table-header"><span>Ticket #</span><span>Subject</span><span>From</span><span>Priority</span><span>Status</span><span>Date</span><span>Actions</span></div>
        <div id="allTickets"></div>
      </div>
    </div>

    <!-- ENQUIRIES PAGE -->
    <div class="page" id="page-enquiries">
      <div class="topbar">
        <h1>Enquiries <span style="font-size:.9rem;font-weight:400;color:rgba(255,255,255,.35);font-family:DM Sans">from Contact Us</span></h1>
        <div class="topbar-actions">
          <input type="text" class="search-box" id="enqSearchBox" placeholder="Search enquiries…" oninput="handleEnqSearch()">
          <button class="btn btn-ghost" onclick="loadAll()">↻ Refresh</button>
          <button class="btn btn-primary" onclick="exportEnqCSV()">⬇ Export CSV</button>
        </div>
      </div>
      <div class="filters">
        <button class="filter-btn active" onclick="filterEnquiries('all',this)">All</button>
        <button class="filter-btn" onclick="filterEnquiries('new',this)">🆕 New</button>
        <button class="filter-btn" onclick="filterEnquiries('contacted',this)">📞 Contacted</button>
        <button class="filter-btn" onclick="filterEnquiries('in-progress',this)">🟡 In Progress</button>
        <button class="filter-btn" onclick="filterEnquiries('converted',this)">✅ Converted</button>
        <button class="filter-btn" onclick="filterEnquiries('closed',this)">⚫ Closed</button>
      </div>
      <div class="table-wrap">
        <div class="table-header" style="grid-template-columns:110px 1fr 140px 120px 100px 90px">
          <span>Ref #</span><span>Contact</span><span>Company</span><span>Budget</span><span>Status</span><span>Actions</span>
        </div>
        <div id="allEnquiries"></div>
      </div>
    </div>

  </main>
</div>

<!-- ── ENQUIRY DETAIL MODAL ── -->
<div class="modal-backdrop" id="enqModalBackdrop" onclick="closeEnqModal(event)">
  <div class="modal" id="enqModal">
    <div class="modal-header">
      <h2 id="enqModalTitle">Enquiry Details</h2>
      <span id="enqModalBadge"></span>
      <button class="modal-close" onclick="closeEnqModalDirect()">✕</button>
    </div>
    <div class="modal-body">
      <div class="detail-grid" id="enqDetailGrid"></div>
      <div class="detail-message">
        <div class="detail-label">Project Description</div>
        <pre id="enqDetailDesc" style="font-family:DM Sans,sans-serif;font-size:.875rem;color:rgba(245,243,238,.7);white-space:pre-wrap;line-height:1.6;font-weight:300;"></pre>
      </div>
      <div id="enqServicesWrap" style="background:rgba(255,255,255,.04);border-radius:2px;padding:1rem;">
        <div class="detail-label" style="font-size:.6rem;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:.6rem;">Services Interested In</div>
        <div id="enqServicesList" style="display:flex;flex-wrap:wrap;gap:.4rem;"></div>
      </div>
      <div>
        <label class="form-label">Update Status</label>
        <select class="status-select" id="enqStatusSelect">
          <option value="new">🆕 New</option>
          <option value="contacted">📞 Contacted</option>
          <option value="in-progress">🟡 In Progress</option>
          <option value="converted">✅ Converted</option>
          <option value="closed">⚫ Closed</option>
        </select>
      </div>
      <div>
        <label class="form-label">Admin Notes</label>
        <textarea class="notes-input" id="enqAdminNotes" placeholder="Add internal notes about this enquiry…"></textarea>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveEnquiry()">💾 Save Changes</button>
      <button class="btn btn-ghost" onclick="closeEnqModalDirect()">Cancel</button>
      <button class="btn" style="background:rgba(220,38,38,.1);color:#dc2626;margin-left:auto;" onclick="deleteEnquiry()">🗑 Delete</button>
    </div>
  </div>
</div>

<!-- ── TICKET DETAIL MODAL ── -->
<div class="modal-backdrop" id="modalBackdrop" onclick="closeModal(event)">
  <div class="modal" id="modal">
    <div class="modal-header">
      <h2 id="modalTitle">Ticket Details</h2>
      <span id="modalBadge"></span>
      <button class="modal-close" onclick="closeModalDirect()">✕</button>
    </div>
    <div class="modal-body">
      <div class="detail-grid" id="detailGrid"></div>
      <div class="detail-message">
        <div class="detail-label">Message</div>
        <pre id="detailMessage"></pre>
      </div>
      <div>
        <label class="form-label">Update Status</label>
        <select class="status-select" id="statusSelect">
          <option value="open">🔵 Open</option>
          <option value="in-progress">🟡 In Progress</option>
          <option value="resolved">🟢 Resolved</option>
          <option value="closed">⚫ Closed</option>
        </select>
      </div>
      <div>
        <label class="form-label">Admin Notes</label>
        <textarea class="notes-input" id="adminNotes" placeholder="Add internal notes about this ticket…"></textarea>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveTicket()">💾 Save Changes</button>
      <button class="btn btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn" style="background:rgba(220,38,38,.1);color:var(--urgent);margin-left:auto;" onclick="deleteTicket()">🗑 Delete Ticket</button>
    </div>
  </div>
</div>

<!-- ── TOAST ── -->
<div class="toast" id="toast"><span id="toastMsg"></span></div>

<script>
let allTickets = [];
let currentTicketId = null;
let activeStatus = 'all';
let activePriority = null;

// ── Page navigation ────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
}

// ── Load all data ──────────────────────────
async function loadAll() {
  await Promise.all([loadStats(), loadTickets(), loadEnquiries()]);
}

// ── Load stats ─────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch('/api/stats');
    const data = await res.json();
    const s    = data.stats;

    document.getElementById('statOpen').textContent     = s.open;
    document.getElementById('statProgress').textContent = s.inProgress;
    document.getElementById('statResolved').textContent = s.resolved;
    document.getElementById('statUrgent').textContent   = s.urgent;
    document.getElementById('sidebarOpenCount').textContent   = s.open;
    document.getElementById('sidebarUrgentCount').textContent = s.urgent;
    // Enquiry stats
    if (s.enquiries) {
      document.getElementById('statEnqTotal').textContent  = s.enquiries.new_;
      document.getElementById('sidebarEnqCount').textContent = s.enquiries.total;
    }

    // Bar chart
    const barChart  = document.getElementById('barChart');
    const barLabels = document.getElementById('barLabels');
    const max = Math.max(...s.last7Days.map(d => d.count), 1);
    barChart.innerHTML  = s.last7Days.map(d =>
      \`<div class="bc-bar" style="height:\${Math.max((d.count/max)*100,4)}%">
        <div class="bc-tip">\${d.count} ticket\${d.count!==1?'s':''} on \${d.date}</div>
       </div>\`
    ).join('');
    barLabels.innerHTML = s.last7Days.map(d =>
      \`<div class="bc-label">\${d.label}</div>\`
    ).join('');

    // Category chart
    const cats   = Object.entries(s.byCategory).sort((a,b)=>b[1]-a[1]);
    const maxCat = cats[0]?.[1] || 1;
    document.getElementById('catList').innerHTML = cats.length
      ? cats.map(([cat, count]) => \`
          <div class="cat-row">
            <div class="cat-name">\${cat}</div>
            <div class="cat-bar-wrap"><div class="cat-bar-fill" style="width:\${(count/maxCat)*100}%"></div></div>
            <div class="cat-count">\${count}</div>
          </div>\`
        ).join('')
      : '<div style="color:rgba(255,255,255,.2);font-size:.8rem;">No data yet</div>';
  } catch(e) {
    console.error('Stats error:', e);
  }
}

// ── Load tickets ───────────────────────────
async function loadTickets() {
  try {
    const res  = await fetch('/api/tickets');
    const data = await res.json();
    allTickets = data.tickets || [];
    renderTickets();
  } catch(e) {
    console.error('Tickets error:', e);
    showToast('Failed to load tickets', true);
  }
}

// ── Render tickets ─────────────────────────
function renderTickets() {
  let filtered = [...allTickets];
  if (activeStatus !== 'all') filtered = filtered.filter(t => t.status === activeStatus);
  if (activePriority)         filtered = filtered.filter(t => t.priority === activePriority);
  const q = document.getElementById('searchBox')?.value?.toLowerCase();
  if (q) {
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.ticketNumber.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q)
    );
  }

  const html = filtered.length
    ? filtered.map(t => ticketRow(t)).join('')
    : \`<div class="empty-state"><div class="icon">📭</div>No tickets found</div>\`;

  const allEl    = document.getElementById('allTickets');
  const recentEl = document.getElementById('recentTickets');
  if (allEl)    allEl.innerHTML    = html;
  if (recentEl) recentEl.innerHTML = filtered.length
    ? filtered.slice(0, 5).map(t => ticketRow(t)).join('')
    : \`<div class="empty-state"><div class="icon">🎉</div>No tickets yet — looking good!</div>\`;
}

function ticketRow(t) {
  const date = new Date(t.submittedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  return \`
    <div class="ticket-row" onclick="openTicket('\${t.id}')">
      <div class="ticket-num">\${t.ticketNumber}</div>
      <div>
        <div class="ticket-subject">\${escHtml(t.subject)}</div>
        <div class="ticket-name">\${escHtml(t.name)}</div>
        <div class="ticket-email-sm">\${escHtml(t.email)}</div>
      </div>
      <div class="ticket-name">\${escHtml(t.category)}</div>
      <div><span class="badge badge-\${t.priority}">\${t.priority}</span></div>
      <div><span class="badge badge-\${t.status.replace('-','')}">\${t.status}</span></div>
      <div class="ticket-date">\${date}</div>
      <div class="row-actions" onclick="event.stopPropagation()">
        <button class="row-btn row-btn-view" onclick="openTicket('\${t.id}')">View</button>
        <button class="row-btn row-btn-del"  onclick="confirmDelete('\${t.id}')">Del</button>
      </div>
    </div>\`;
}

// ── Filters ────────────────────────────────
function filterTickets(status, btn) {
  activeStatus   = status;
  activePriority = null;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTickets();
}
function filterByPriority(priority) {
  activePriority = priority;
  activeStatus   = 'all';
  renderTickets();
}
function handleSearch() { renderTickets(); }

// ── Open ticket modal ──────────────────────
function openTicket(id) {
  const t = allTickets.find(x => x.id === id);
  if (!t) return;
  currentTicketId = id;

  document.getElementById('modalTitle').textContent = t.ticketNumber + ' — ' + t.subject;
  document.getElementById('modalBadge').innerHTML   = \`<span class="badge badge-\${t.priority}">\${t.priority}</span>\`;
  document.getElementById('detailMessage').textContent = t.message;
  document.getElementById('statusSelect').value        = t.status;
  document.getElementById('adminNotes').value          = t.adminNotes || '';

  const submitted = new Date(t.submittedAt).toLocaleString('en-IN');
  document.getElementById('detailGrid').innerHTML = [
    ['Name',     t.name],
    ['Email',    t.email],
    ['Plan',     t.plan],
    ['Category', t.category],
    ['Priority', t.priority.toUpperCase()],
    ['Submitted',submitted],
  ].map(([label, value]) => \`
    <div class="detail-item">
      <div class="detail-label">\${label}</div>
      <div class="detail-value">\${escHtml(String(value))}</div>
    </div>\`
  ).join('');

  document.getElementById('modalBackdrop').classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalBackdrop')) closeModalDirect();
}
function closeModalDirect() {
  document.getElementById('modalBackdrop').classList.remove('open');
  currentTicketId = null;
}

// ── Save ticket changes ────────────────────
async function saveTicket() {
  if (!currentTicketId) return;
  const status     = document.getElementById('statusSelect').value;
  const adminNotes = document.getElementById('adminNotes').value;
  try {
    const res  = await fetch(\`/api/tickets/\${currentTicketId}\`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status, adminNotes }),
    });
    const data = await res.json();
    if (data.success) {
      const idx = allTickets.findIndex(t => t.id === currentTicketId);
      if (idx !== -1) allTickets[idx] = data.ticket;
      renderTickets();
      loadStats();
      closeModalDirect();
      showToast('✅ Ticket updated successfully!');
    }
  } catch(e) { showToast('Failed to update ticket', true); }
}

// ── Delete ticket ──────────────────────────
async function confirmDelete(id) {
  if (!confirm('Delete this ticket? This cannot be undone.')) return;
  try {
    const res  = await fetch(\`/api/tickets/\${id}\`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      allTickets = allTickets.filter(t => t.id !== id);
      renderTickets(); loadStats(); closeModalDirect();
      showToast('🗑 Ticket deleted.');
    }
  } catch(e) { showToast('Failed to delete ticket', true); }
}
function deleteTicket() { if (currentTicketId) confirmDelete(currentTicketId); }

// ── Export CSV ─────────────────────────────
function exportCSV() {
  const headers = ['Ticket #','Name','Email','Subject','Category','Plan','Priority','Status','Message','Submitted'];
  const rows    = allTickets.map(t => [
    t.ticketNumber, t.name, t.email, t.subject,
    t.category, t.plan, t.priority, t.status,
    t.message.replace(/"/g, '""'),
    new Date(t.submittedAt).toLocaleString('en-IN'),
  ].map(v => \`"\${v}"\`).join(','));
  const csv  = [headers.join(','), ...rows].join('\\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = \`buildscale-tickets-\${Date.now()}.csv\`;
  a.click(); URL.revokeObjectURL(url);
  showToast('📥 Exported ' + allTickets.length + ' tickets to CSV');
}

// ── Toast notification ─────────────────────
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.className = 'toast' + (isError ? ' error' : '') + ' show';
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Escape HTML ────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ───────────────────────────────────
loadAll();
setInterval(loadAll, 30000); // auto-refresh every 30s
</script>
</body>
</html>`;
}