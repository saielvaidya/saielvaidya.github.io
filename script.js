{
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let seed = 7;
const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const toastEl = document.getElementById('toast');
let toastT;
const toast = m => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2000); };

/* role ticker */
const words = ['vector search engines', 'retrieval systems', 'AI agents', 'ML-backed APIs'];
const tk = document.getElementById('ticker');
if (!reduce) {
  let w = 0, c = words[0].length, del = true;
  const step = () => {
    if (del) { c--; if (c === 0) { del = false; w = (w + 1) % words.length; } }
    else { c++; if (c === words[w].length) { del = true; tk.textContent = words[w]; setTimeout(step, 2200); return; } }
    tk.textContent = words[w].slice(0, c) || ' ';
    setTimeout(step, del ? 35 : 70);
  };
  setTimeout(step, 2400);
}

/* point cloud: layered graph <-> ball */
const cv = document.getElementById('cv'), box = document.getElementById('cloud'), ctx = cv.getContext('2d');
const N = 1000, A = [], B = [];
for (const [y, n] of [[0.85, 620], [0, 270], [-0.85, 110]]) for (let k = 0; k < n; k++) { const r = 1.2 * Math.sqrt(rnd()), t = rnd() * 6.283; A.push([r * Math.cos(t), y, r * Math.sin(t), y > .5 ? 0 : y < -.5 ? 2 : 1]); }
const edges = [];
for (let i = 0; i < N; i++) {
  if (A[i][3] === 0 && i % 2) continue;
  const best = [];
  for (let j = 0; j < N; j++) if (j !== i && A[j][3] === A[i][3]) best.push([(A[i][0] - A[j][0]) ** 2 + (A[i][2] - A[j][2]) ** 2, j]);
  best.sort((a, b) => a[0] - b[0]);
  for (const [, j] of best.slice(0, 2)) edges.push([i, j]);
}
for (let i = 0; i < 680; i++) { const y = 1 - 2 * (i + .5) / 680, r = Math.sqrt(1 - y * y), t = i * 2.39996; B.push([r * Math.cos(t), y, r * Math.sin(t)]); }
const seam = f => { for (let k = 0; k < 80; k++) B.push(f(k / 80 * 6.283)); };
const rr = Math.sqrt(1 - .49);
seam(s => [Math.cos(s), 0, Math.sin(s)]);
seam(s => [0, Math.cos(s), Math.sin(s)]);
seam(s => [0.7, rr * Math.cos(s), rr * Math.sin(s)]);
seam(s => [-0.7, rr * Math.cos(s), rr * Math.sin(s)]);
let W = 0, H = 0, dpr = 1, rot = 0.6, mx = 0, my = 0, t = 0, target = 0, last = performance.now();
const ease = x => x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
function draw() {
  if (!W) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const e = ease(t), R = Math.min(W * .34, H * .32), cx = W * .5, cy = H * .46, D = 3.4;
  const ay = rot + mx * 0.6, ax = 0.36 * (1 - e) + 0.15 * e + my * 0.2;
  const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
  const P = new Array(N);
  for (let i = 0; i < N; i++) {
    const a = A[i], b = B[i];
    const x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e, z = a[2] + (b[2] - a[2]) * e;
    const x1 = x * ca - z * sa, z1 = x * sa + z * ca, y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
    const f = D / (D + z2);
    P[i] = [cx + x1 * f * R, cy + y1 * f * R, f, z2];
  }
  if (e < .98) {
    ctx.strokeStyle = 'rgba(244,242,238,' + (0.13 * (1 - e)).toFixed(3) + ')';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const [i, j] of edges) { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); }
    ctx.stroke();
  }
  for (let i = 0; i < N; i++) {
    const [x, y, f, z] = P[i];
    const al = Math.max(.12, Math.min(1, .78 - z * .38));
    const hot = (e < .5 && A[i][3] === 2) || (e >= .5 && i >= 680);
    ctx.fillStyle = hot ? 'rgba(214,178,124,' + al.toFixed(3) + ')' : 'rgba(244,242,238,' + (al * .55).toFixed(3) + ')';
    const s = (hot ? 2.6 : 1.5) * f;
    ctx.beginPath(); ctx.arc(x, y, s / 2 + .3, 0, 6.283); ctx.fill();
  }
}
const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; draw(); };
const bIdx = document.getElementById('sIdx'), bBall = document.getElementById('sBall');
const setTarget = v => { target = v; bIdx.setAttribute('aria-pressed', v === 0); bBall.setAttribute('aria-pressed', v === 1); if (reduce) { t = v; draw(); } };
let auto;
const restartAuto = () => { clearInterval(auto); if (!reduce) auto = setInterval(() => setTarget(1 - target), 7000); };
bIdx.addEventListener('click', e => { e.stopPropagation(); setTarget(0); restartAuto(); });
bBall.addEventListener('click', e => { e.stopPropagation(); setTarget(1); restartAuto(); });
box.addEventListener('click', () => { setTarget(1 - target); restartAuto(); });
box.addEventListener('pointermove', ev => { const r = box.getBoundingClientRect(); mx = (ev.clientX - r.left) / r.width - .5; my = (ev.clientY - r.top) / r.height - .5; if (reduce) draw(); });
const tick = now => {
  const dt = Math.min(50, now - last); last = now;
  rot += dt * 0.00018;
  t += (target - t) * Math.min(1, dt * 0.0022);
  if (Math.abs(target - t) < .001) t = target;
  draw();
  requestAnimationFrame(tick);
};
const roCloud = new ResizeObserver(size); roCloud.observe(box);
if (!reduce) { requestAnimationFrame(tick); restartAuto(); }

/* experience */
const jobs = [
  { short: 'Laurier research', role: 'Undergraduate Research Assistant', org: 'Wilfrid Laurier University · Waterloo, ON', s: [2026, 10], e: null, when: 'Oct 2026', pts: [
    'Implementing a multi-agent negotiation algorithm in Python that reorganizes a codebase’s modules under a user-set stability budget, balancing module cohesion against change from the previous version in O(n × k) steps.',
    'Reproducing a published paper’s results on a 156-class Java system by parsing bytecode dependencies across 6 stability thresholds, targeting 0.958 stability vs. 0.917 for the Bunch baseline.'] },
  { short: 'StartUp Lab', role: 'Consulting Team Lead', org: 'Laurier StartUp Lab Consulting Program · Client: VYPA Technologies', s: [2026, 10], e: null, when: 'Oct 2026', pts: [
    'Leading a team building a growth playbook for VYPA, a three-sided digital-screen marketplace, scoping deliverables, targets and check-in cadence directly with the founder.',
    'Analyzing screen-network data and website analytics to recommend host categories, advertiser segments and pricing packages.'] },
  { short: 'Azeonics', role: 'Software Engineering Intern, Backend & ML Systems', org: 'Azeonics · Remote', s: [2026, 5], e: [2026, 8], when: 'May – Aug 2026', pts: [
    'Designed and built 3 Python REST endpoints for satellite-imagery search, serving FAISS nearest-neighbour retrieval of comparable crop fields over 10K ViT-embedded images at 200 ms p95 latency.',
    'Deployed 2 Dockerized services on AWS EC2 for retrieval evaluation, A/B testing and analyst feedback capture, with input validation, structured error responses and PostgreSQL persistence.',
    'Improved Recall@10 by 40% via contrastive ViT fine-tuning; raised equipment-failure prediction F1 from 0.54 to 0.81 with gradient boosting.'] },
  { short: 'Laurier AVIT', role: 'Audio Visual & IT Specialist', org: 'Wilfrid Laurier University, AVIT Department · Waterloo, ON', s: [2025, 8], e: [2026, 4], when: 'Aug 2025 – Apr 2026', pts: [
    'Resolved 250+ requests across 100+ classrooms at about 5 minutes per incident.',
    'Supported 200+ live events per semester with up to 1,000 attendees, and wrote runbooks for recurring faults.'] },
  { short: 'AstrovaFit', role: 'Frontend Developer', org: 'AstrovaFit · Toronto, ON (remote)', s: [2025, 1], e: [2025, 3], when: 'Jan – Mar 2025', pts: [
    'Built and launched astrovafit.com from scratch in 8 weeks using React, JavaScript, HTML and CSS, creating 10+ reusable components across 3+ sections.',
    'Optimized rendering and asset loading to reach a Lighthouse mobile performance score of 92.'] }
];
const m0 = 2025 * 12, span = 2026 * 12 + 11 - m0 + 1;
const mi = ([y, m]) => y * 12 + m - 1 - m0;
document.getElementById('gantt').innerHTML = jobs.map(j => {
  const a = mi(j.s), b = j.e ? mi(j.e) + 1 : span;
  return '<div class="grow"><span>' + esc(j.short) + '</span><div class="track"><div class="bar' + (j.e ? '' : ' live') + '" style="left:' + (a / span * 100).toFixed(2) + '%;width:' + ((b - a) / span * 100).toFixed(2) + '%"></div></div></div>';
}).join('') + '<div class="ticks">' + [[0, 'Jan 2025'], [6, 'Jul'], [12, 'Jan 2026'], [18, 'Jul'], [span, 'Now']].map(([m, l]) => '<span style="left:' + (m / span * 100).toFixed(2) + '%' + (m === span ? ';transform:translateX(-100%)' : m === 0 ? ';transform:none' : '') + '">' + l + '</span>').join('') + '</div>';
document.getElementById('jobs').innerHTML = jobs.map(j => '<article class="job"><time>' + (j.e ? esc(j.when) : '<b>● Now</b>since ' + esc(j.when)) + '</time><div><h4>' + esc(j.role) + '</h4><p class="org">' + esc(j.org) + '</p><ul>' + j.pts.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></div></article>').join('');

/* project art */
const W1 = 'rgba(244,242,238,', PK = '#d6b27c';
const artHNSW = () => {
  let s = '<svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">';
  const pts = [];
  [[110, 14], [205, 34], [310, 80]].forEach(([y, n], L) => {
    s += '<path d="M80 ' + y + 'L420 ' + (y - 40) + 'L530 ' + (y + 10) + 'L190 ' + (y + 50) + 'Z" fill="' + W1 + '.025)" stroke="' + W1 + '.14)" stroke-width="1"/>';
    pts[L] = [];
    for (let k = 0; k < n; k++) { const u = rnd(), v = rnd(); const x = 85 + u * 335 + v * 105, yy = y - u * 40 + v * 50; pts[L].push([x, yy]); s += '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="' + (L === 2 ? 2.4 : L ? 3 : 4) + '" fill="' + W1 + (L ? .5 : .9) + ')"/>'; }
  });
  const path = [pts[0][2], pts[0][7], [pts[0][7][0], pts[0][7][1] + 95], pts[1][4], [pts[1][4][0], pts[1][4][1] + 105], pts[2][10]];
  s += '<polyline points="' + path.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ') + '" fill="none" stroke="' + PK + '" stroke-width="2.5" stroke-dasharray="6 5" stroke-linejoin="round"/>';
  s += '<circle cx="' + pts[2][10][0].toFixed(1) + '" cy="' + pts[2][10][1].toFixed(1) + '" r="14" fill="' + PK + '" opacity=".25"/><circle cx="' + pts[2][10][0].toFixed(1) + '" cy="' + pts[2][10][1].toFixed(1) + '" r="7" fill="' + PK + '"/>';
  return s + '</svg>';
};
const artBills = () => {
  let s = '<svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">';
  for (let i = 0; i < 9; i++) {
    const h = 40 + rnd() * 150, x = 70 + i * 38;
    s += '<path d="M' + (x + 11) + ' ' + (320 - h).toFixed(0) + 'C' + (x + 60) + ' 70 430 110 470 106" fill="none" stroke="' + W1 + '.1)" stroke-width="1"/>';
    s += '<rect x="' + x + '" y="' + (320 - h).toFixed(0) + '" width="22" height="' + h.toFixed(0) + '" rx="11" fill="' + W1 + (i % 2 ? .25 : .6) + ')"/>';
  }
  s += '<rect x="440" y="100" width="64" height="220" rx="32" fill="' + PK + '"/><line x1="50" y1="320" x2="550" y2="320" stroke="' + W1 + '.15)"/>';
  return s + '</svg>';
};
const artMeet = () => {
  let s = '<svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">';
  for (let i = 0; i < 36; i++) { const h = 10 + Math.abs(Math.sin(i * .7) * 70 + (rnd() - .5) * 60); s += '<rect x="' + (50 + i * 7.5) + '" y="' + (200 - h / 2).toFixed(0) + '" width="4.5" height="' + h.toFixed(0) + '" rx="2.25" fill="' + W1 + '.5)"/>'; }
  s += '<path d="M335 200h40m-12-10 12 10-12 10" stroke="' + PK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  [110, 150, 190, 230, 270].forEach((y, k) => {
    s += '<rect x="400" y="' + (y - 10) + '" width="20" height="20" rx="6" fill="' + (k < 3 ? PK : 'none') + '" stroke="' + (k < 3 ? PK : W1 + '.35)') + '" stroke-width="1.5"/>';
    if (k < 3) s += '<path d="M405 ' + y + 'l4 4 7-8" stroke="#000" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    s += '<rect x="432" y="' + (y - 4) + '" width="' + (70 + rnd() * 60).toFixed(0) + '" height="8" rx="4" fill="' + W1 + '.35)"/>';
  });
  return s + '</svg>';
};
const projects = [
  { name: 'HNSW Vector Search Engine', tags: ['Python', 'NumPy', 'FAISS', 'Pytest', 'Aug 2026 – present'], art: artHNSW, stat: '95.5% recall@10 on 10,000 vectors', pts: [
    'An approximate nearest-neighbour index built from scratch in Python and NumPy, with layered graph construction, heuristic neighbour selection and pruning.',
    'Benchmarked against exact search and FAISS HNSW (99.8% recall@10) on recall, build time, query latency and throughput, then exposed through a search API for a semantic document-search app. Covered by 24 Pytest tests.'] },
  { name: 'Adisade', tags: ['Flask', 'PostgreSQL', 'OpenAI API', 'Jul 2026 – present'], art: artBills, stat: 'Every bill, one monthly number', pts: [
    'A recurring billing and expense platform: a Flask and PostgreSQL API on Render that normalizes weekly, monthly and yearly cycles into monthly and annual totals.',
    'Money stored as NUMERIC, never floats. 20 Pytest tests on GitHub Actions, and the OpenAI API flags overspending and suggests savings.'] },
  { name: 'MeetIQ', tags: ['Python', 'OpenAI API', 'Speech-to-text', 'Gradio', 'May 2026'], art: artMeet, stat: 'Audio in, action items out', pts: [
    'An AI meeting assistant that turns recordings into transcripts, summaries, decisions and action items.',
    'Its transcript-grounded Q&A declines to answer rather than invent one when the meeting didn’t cover the question.'] }
];
document.getElementById('projs').innerHTML = projects.map(p => '<article class="card proj"><div class="art">' + p.art() + '</div><div class="body"><h4>' + esc(p.name) + '</h4><ul class="tags">' + p.tags.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><p class="stat">' + esc(p.stat) + '</p>' + p.pts.map(x => '<p>' + esc(x) + '</p>').join('') + '<a class="more" href="https://github.com/saielvaidya">View on GitHub ' + arrow + '</a></div></article>').join('');

/* playground */
const pfig = document.getElementById('pfig'), psvg = document.getElementById('psvg');
let pts = [], nbr = [], q = [0.78, 0.3];
const build = () => {
  pts = Array.from({ length: 160 }, () => [0.04 + rnd() * 0.92, 0.05 + rnd() * 0.9]);
  const d = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  nbr = pts.map((p, i) => pts.map((o, j) => [d(p, o), j]).filter(x => x[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 5).map(x => x[1]));
  nbr.forEach((l, i) => l.forEach(j => { if (!nbr[j].includes(i)) nbr[j].push(i); }));
};
const search = () => {
  const d = i => (pts[i][0] - q[0]) ** 2 + (pts[i][1] - q[1]) ** 2;
  const seen = new Set([0]);
  let cur = 0, cd = d(0), moved = true;
  const path = [0];
  while (moved) {
    moved = false;
    for (const j of nbr[cur]) { seen.add(j); const dj = d(j); if (dj < cd) { cd = dj; cur = j; moved = true; } }
    if (moved) path.push(cur);
  }
  let best = 0; for (let i = 1; i < pts.length; i++) if (d(i) < d(best)) best = i;
  return { path, cmp: seen.size, ok: best === cur, best };
};
const drawPlay = () => {
  const W = pfig.clientWidth, H = pfig.clientHeight;
  if (!W || !pts.length) return;
  const X = p => (p[0] * W).toFixed(1), Y = p => (p[1] * H).toFixed(1);
  const r = search();
  let s = '<g stroke="rgba(244,242,238,.1)" stroke-width="1">';
  nbr.forEach((l, i) => l.forEach(j => { if (j > i) s += '<line x1="' + X(pts[i]) + '" y1="' + Y(pts[i]) + '" x2="' + X(pts[j]) + '" y2="' + Y(pts[j]) + '"/>'; }));
  s += '</g>' + pts.map(p => '<circle cx="' + X(p) + '" cy="' + Y(p) + '" r="2.6" fill="rgba(244,242,238,.55)"/>').join('');
  s += '<polyline points="' + r.path.map(i => X(pts[i]) + ',' + Y(pts[i])).join(' ') + '" fill="none" stroke="#d6b27c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 6px rgba(214,178,124,.7))"/>';
  s += r.path.map((i, k) => '<circle cx="' + X(pts[i]) + '" cy="' + Y(pts[i]) + '" r="' + (k ? 4.5 : 7) + '" fill="#d6b27c"/>').join('');
  if (!r.ok) s += '<circle cx="' + X(pts[r.best]) + '" cy="' + Y(pts[r.best]) + '" r="10" fill="none" stroke="#f4f2ee" stroke-width="1.5" stroke-dasharray="3 3"/>';
  s += '<circle cx="' + X(q) + '" cy="' + Y(q) + '" r="13" fill="none" stroke="#f4f2ee" stroke-width="2"/><circle cx="' + X(q) + '" cy="' + Y(q) + '" r="3.5" fill="#f4f2ee"/>';
  const ep = pts[0], right = ep[0] < .85;
  s += '<text x="' + (ep[0] * W + (right ? 14 : -14)).toFixed(1) + '" y="' + (ep[1] * H + 5).toFixed(1) + '" text-anchor="' + (right ? 'start' : 'end') + '" fill="#e6c999" font-size="14" font-weight="500" font-family="Manrope,sans-serif" style="paint-order:stroke;stroke:#0b0b0d;stroke-width:4px">entry</text>';
  psvg.innerHTML = s;
  document.getElementById('sHops').textContent = r.path.length - 1;
  document.getElementById('sCmp').textContent = r.cmp + '/' + pts.length;
  document.getElementById('sOk').textContent = r.ok ? 'yes' : 'near miss';
};
const moveQ = e => { const b = pfig.getBoundingClientRect(); q = [Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), Math.min(1, Math.max(0, (e.clientY - b.top) / b.height))]; drawPlay(); };
let dragging = false;
pfig.addEventListener('pointerdown', e => { dragging = true; pfig.setPointerCapture(e.pointerId); moveQ(e); });
pfig.addEventListener('pointermove', e => { if (dragging) moveQ(e); });
pfig.addEventListener('pointerup', () => { dragging = false; });
document.getElementById('reshuffle').onclick = () => { build(); drawPlay(); };
seed = 42; build();
for (const c of [[0.8, 0.25], [0.85, 0.7], [0.6, 0.85], [0.7, 0.45], [0.9, 0.15], [0.5, 0.2]]) { q = c; const r = search(); if (r.ok && r.path.length > 4) break; }
const roPlay = new ResizeObserver(drawPlay); roPlay.observe(pfig);

/* toolkit */
const kit = [
  ['ML and AI', ['Vector search (HNSW, FAISS)', 'LLMs', 'RAG', 'AI agents & tool calling', 'Hugging Face Transformers', 'LoRA/QLoRA', 'NumPy']],
  ['Languages', ['Python', 'Java', 'JavaScript', 'SQL', 'C++', 'C']],
  ['Backend and cloud', ['REST APIs', 'Flask', 'Django', 'PostgreSQL', 'MySQL', 'SQLite', 'Docker', 'AWS EC2', 'Render']],
  ['Frontend', ['React', 'HTML/CSS', 'Tailwind CSS']],
  ['Practices', ['Git', 'Linux', 'Pytest', 'GitHub Actions CI/CD', 'Agile', 'Copilot, Cursor, Claude Code']]
];
document.getElementById('kit').innerHTML = kit.map(([k, v]) => '<div class="card"><h3>' + esc(k) + '</h3><ul>' + v.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>').join('');

/* spotlight on cards */
document.addEventListener('pointermove', e => {
  const c = e.target.closest && e.target.closest('.card');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--x', (e.clientX - r.left) + 'px');
  c.style.setProperty('--y', (e.clientY - r.top) + 'px');
});

/* nav: highlight the section in view */
const navLinks = [...document.querySelectorAll('#links a')];
const spy = ['top', 'about', 'work', 'projects', 'playground', 'toolkit', 'contact'].map(id => document.getElementById(id));
let navLock = 0, navQueued = false;
const setActive = id => navLinks.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + id));
const updateNav = () => {
  navQueued = false;
  if (performance.now() < navLock) return;
  const line = innerHeight * 0.3;
  let cur = 'top';
  for (const el of spy) if (el.getBoundingClientRect().top <= line) cur = el.id;
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = 'contact';
  setActive(cur);
};
addEventListener('scroll', () => { if (!navQueued) { navQueued = true; requestAnimationFrame(updateNav); } }, { passive: true });
addEventListener('resize', updateNav);
navLinks.forEach(a => a.addEventListener('click', () => { setActive(a.getAttribute('href').slice(1)); navLock = performance.now() + 900; setTimeout(updateNav, 950); }));
updateNav();

/* copy email */
const copyEmail = async () => {
  try { await navigator.clipboard.writeText('vaidya.saiel1600@gmail.com'); toast('Email copied'); }
  catch (e) { toast('Copy blocked here: vaidya.saiel1600@gmail.com'); }
};
document.getElementById('copy').addEventListener('click', copyEmail);

/* command menu */
const pal = document.getElementById('pal'), qi = document.getElementById('q'), list = document.getElementById('cmds');
const go = id => () => document.getElementById(id).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
const open = u => () => { const a = document.createElement('a'); a.href = u; a.rel = 'noopener'; a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove(); };
const cmds = [
  ['About', 'Section', go('about')], ['Experience', 'Section', go('work')], ['Projects', 'Section', go('projects')],
  ['Playground', 'Section', go('playground')], ['Toolkit', 'Section', go('toolkit')], ['Contact', 'Section', go('contact')],
  ['Copy email address', 'Action', copyEmail], ['Switch cloud shape', 'Action', () => { setTarget(1 - target); restartAuto(); }],
  ['Open GitHub', 'Link', open('https://github.com/saielvaidya')], ['Open LinkedIn', 'Link', open('https://linkedin.com/in/saiel-vaidya')]
];
let shown = cmds, sel = 0;
const render = () => {
  const v = qi.value.trim().toLowerCase();
  shown = cmds.filter(c => c[0].toLowerCase().includes(v));
  sel = Math.min(sel, Math.max(0, shown.length - 1));
  list.innerHTML = shown.length ? shown.map((c, i) => '<li role="option" data-i="' + i + '" aria-selected="' + (i === sel) + '">' + esc(c[0]) + '<span>' + esc(c[1]) + '</span></li>').join('') : '<li class="empty">Nothing matches that. Try "projects" or "email".</li>';
};
const openPal = () => { if (pal.open) return; qi.value = ''; sel = 0; render(); pal.showModal(); qi.focus(); };
const run = i => { const c = shown[i]; if (!c) return; pal.close(); c[2](); };
document.getElementById('kopen').addEventListener('click', openPal);
document.addEventListener('keydown', e => {
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName))) { e.preventDefault(); openPal(); }
});
qi.addEventListener('input', () => { sel = 0; render(); });
qi.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); render(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); render(); }
  else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
});
list.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) run(+li.dataset.i); });
pal.addEventListener('click', e => { if (e.target === pal) pal.close(); });
}
