import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const tools = process.env.PRESENTATION_TOOLS_PATH || '/tmp/omnirush/stockpilot-presentation-tools';
const requireTools = createRequire(path.join(tools, 'package.json'));
const requireProject = createRequire(path.join(root, 'package.json'));
const PptxGenJS = requireTools('pptxgenjs');
const sharp = requireTools('sharp');
const fontkit = requireTools('fontkit');
const JSZip = requireTools('jszip');
const { chromium } = requireProject('@playwright/test');
const regular = fontkit.openSync(process.env.PRESENTATION_FONT_REGULAR || '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
const bold = fontkit.openSync(process.env.PRESENTATION_FONT_BOLD || '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
const W = 13.333333, H = 7.5, PX = 96, total = 15;
const C = {
  navy: '132235', ink: '182B42', teal: '087F80', green: '166C5C', orange: 'F2AD65',
  muted: '617487', paper: 'F5F7F9', white: 'FFFFFF', border: 'DCE5EC', pale: 'E9F4F1',
  paleOrange: 'FFF1E1', red: 'B13F43', paleRed: 'FBEDEE', darkCard: '203349', light: 'B8CBDC',
};
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'StockPilot';
pptx.subject = 'Verified agentic supply recovery — hackathon pitch';
pptx.title = 'StockPilot | Hackathon Presentation';
pptx.company = 'StockPilot';
pptx.lang = 'en-US';
pptx.theme = { headFontFace: 'DejaVu Sans', bodyFontFace: 'DejaVu Sans', lang: 'en-US' };
const pages = [], warnings = [];
await fs.mkdir(path.join(here, 'assets'), { recursive: true });

function measure(value, size, strong = false) {
  const font = strong ? bold : regular;
  return font.layout(value).positions.reduce((sum, glyph) => sum + glyph.xAdvance, 0) / font.unitsPerEm * size / 72;
}
function wrap(value, width, size, strong) {
  return String(value).split('\n').flatMap(paragraph => {
    if (!paragraph) return [''];
    const lines = []; let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate, size, strong) > width) { lines.push(line); line = word; }
      else line = candidate;
    }
    lines.push(line); return lines;
  });
}

class Page {
  constructor(title, section, { dark = false, source = 'StockPilot • Hackathon pitch', backup = false } = {}) {
    this.number = pages.length + 1; this.title = title; this.dark = dark; this.items = [];
    this.slide = pptx.addSlide(); this.slide.background = { color: dark ? C.navy : C.paper };
    this.svg = [`<rect width="1280" height="720" fill="#${dark ? C.navy : C.paper}"/>`];
    this.text(section.toUpperCase(), 0.6, 0.37, 11.3, 0.22, { size: 10, bold: true, color: dark ? C.orange : C.teal });
    this.text(title, 0.6, 0.83, 12.1, 0.66, { size: 29, bold: true, color: dark ? C.white : C.ink });
    this.line(0.6, 6.94, 12.73, 6.94, { color: dark ? C.darkCard : C.border, width: 0.8 });
    this.text(source, 0.6, 7.06, 10.9, 0.23, { size: 8, color: dark ? C.light : C.muted });
    this.text(`${backup ? 'BACKUP · ' : ''}${String(this.number).padStart(2, '0')} / ${total}`, 11.25, 7.03, 1.48, 0.26, { size: 9, align: 'right', color: dark ? C.light : C.muted });
    pages.push(this);
  }
  bounds(kind, x, y, w, h) {
    if (![x, y, w, h].every(Number.isFinite) || x < -0.001 || y < -0.001 || w < 0 || h < 0 || x + w > W + 0.001 || y + h > H + 0.001) {
      throw new Error(`Slide ${this.number}: ${kind} outside slide (${[x, y, w, h]})`);
    }
    this.items.push({ kind, x, y, w, h });
  }
  rect(x, y, w, h, fill = C.white, stroke = undefined, radius = 0) {
    this.bounds('shape', x, y, w, h);
    this.slide.addShape(radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
      x, y, w, h, fill: { color: fill }, line: { color: stroke || fill, width: stroke ? 0.7 : 0 }, radius,
    });
    this.svg.push(`<rect x="${x * PX}" y="${y * PX}" width="${w * PX}" height="${h * PX}" rx="${radius * PX}" fill="#${fill}"${stroke ? ` stroke="#${stroke}" stroke-width="1"` : ''}/>`);
  }
  text(value, x, y, w, h, { size = 18, min = size - 2, bold: strong = false, color = C.ink, align = 'left', spacing = 1.22 } = {}) {
    this.bounds('text', x, y, w, h);
    const requested = size; let lines = wrap(value, w, size, strong);
    while ((lines.length * size / 72 * spacing > h || lines.some(line => measure(line, size, strong) > w)) && size > min) {
      size -= 0.5; lines = wrap(value, w, size, strong);
    }
    if (lines.length * size / 72 * spacing > h + 0.004 || lines.some(line => measure(line, size, strong) > w + 0.004)) {
      throw new Error(`Slide ${this.number}: text does not fit: ${value}`);
    }
    if (size !== requested) warnings.push(`Slide ${this.number}: ${requested} → ${size} pt: ${String(value).slice(0, 45)}`);
    lines.forEach((line, index) => {
      const top = y + index * size / 72 * spacing;
      this.slide.addText(line, { x, y: top, w, h: size / 72 * 1.21, margin: 0, fontFace: 'DejaVu Sans', fontSize: size, bold: strong, color, align, valign: 'top', breakLine: false, paraSpaceAfterPt: 0 });
      const font = strong ? bold : regular;
      const baseline = (top + font.ascent / font.unitsPerEm * size / 72) * PX;
      const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
      const tx = (align === 'center' ? x + w / 2 : align === 'right' ? x + w : x) * PX;
      this.svg.push(`<text x="${tx}" y="${baseline}" font-family="DejaVu Sans" font-size="${size * PX / 72}" font-weight="${strong ? 700 : 400}" fill="#${color}" text-anchor="${anchor}">${escape(line)}</text>`);
    });
  }
  line(x1, y1, x2, y2, { color = C.muted, width = 1.5, arrow = false, dash = false } = {}) {
    this.bounds('line', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    this.slide.addShape(pptx.ShapeType.line, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1, line: { color, width, ...(arrow ? { endArrowType: 'triangle' } : {}), ...(dash ? { dashType: 'dash' } : {}) } });
    this.svg.push(`<line x1="${x1 * PX}" y1="${y1 * PX}" x2="${x2 * PX}" y2="${y2 * PX}" stroke="#${color}" stroke-width="${width * PX / 72}"${dash ? ' stroke-dasharray="5 5"' : ''}/>`);
    if (arrow) {
      const a = Math.atan2(y2 - y1, x2 - x1), len = 0.09, spread = 0.045;
      const bx = x2 - len * Math.cos(a), by = y2 - len * Math.sin(a);
      this.svg.push(`<polygon points="${x2 * PX},${y2 * PX} ${(bx + spread * Math.sin(a)) * PX},${(by - spread * Math.cos(a)) * PX} ${(bx - spread * Math.sin(a)) * PX},${(by + spread * Math.cos(a)) * PX}" fill="#${color}"/>`);
    }
  }
  pill(label, x, y, w, fill = C.pale, color = C.green) {
    this.rect(x, y, w, 0.36, fill, undefined, 0.13);
    this.text(label, x + 0.08, y + 0.065, w - 0.16, 0.23, { size: 10, bold: true, color, align: 'center' });
  }
  card(x, y, w, h, label, body, { fill = C.white, accent = C.teal, size = 16, titleSize = 18 } = {}) {
    this.rect(x, y, w, h, fill, this.dark ? C.darkCard : C.border);
    this.rect(x, y, 0.045, h, accent);
    this.text(label, x + 0.22, y + 0.2, w - 0.44, 0.64, { size: titleSize, bold: true, color: this.dark ? C.white : C.ink });
    this.text(body, x + 0.22, y + 0.95, w - 0.44, h - 1.1, { size, color: this.dark ? C.light : C.muted });
  }
  image(asset, x, y, w, h) {
    this.bounds('image', x, y, w, h);
    this.slide.addImage({ path: asset.file, x, y, w, h });
    this.svg.push(`<image href="data:image/png;base64,${asset.data}" x="${x * PX}" y="${y * PX}" width="${w * PX}" height="${h * PX}" preserveAspectRatio="none"/>`);
  }
  notes(value, seconds = 0) { this.notesText = value; this.seconds = seconds; this.slide.addNotes(value); }
  render() { return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">${this.svg.join('')}</svg>`; }
}

async function crop(name, fractions, output) {
  const source = path.join(root, 'docs/screenshots', name);
  const { width, height } = await sharp(source).metadata();
  const [left, top, w, h] = fractions;
  const file = path.join(here, 'assets', output);
  await sharp(source).extract({ left: Math.round(width * left), top: Math.round(height * top), width: Math.floor(width * w), height: Math.floor(height * h) }).png().toFile(file);
  const buffer = await fs.readFile(file); const info = await sharp(buffer).metadata();
  return { file, data: buffer.toString('base64'), ratio: info.width / info.height };
}
const workflow = await crop('workflow-live-gemini.png', [0, 0, 1, 0.30], 'workflow_focus.png');
const analytics = await crop('analytics-live-gemini.png', [0.17, 0.048, 0.81, 0.30], 'analytics_focus.png');
const agents = await crop('agents-live-gemini.png', [0.19, 0.14, 0.78, 0.20], 'agents_focus.png');
const sourceLive = 'Source: docs/LIVE_ACCEPTANCE.md • Actual Gemini + Atlas • Sandbox business ledger';

// 01 — Title
{
  const s = new Page('stockpilot.', 'Hackathon presentation · October 2026', { dark: true, source: 'Agentic supply recovery • Live Gemini execution verified' });
  s.rect(0.61, 1.65, 0.68, 0.08, C.orange);
  s.text('Supply disrupted.\nRecovery, verified.', 0.6, 2.03, 7.5, 1.75, { size: 43, bold: true, color: C.white });
  s.text('An AI operations workspace that turns urgent\norder goals into approved, executed outcomes.', 0.65, 4.02, 7.3, 1.0, { size: 21, color: C.light });
  s.pill('LIVE GEMINI + MONGODB ATLAS', 0.65, 5.57, 3.7, C.darkCard, C.orange);
  const labels = [['01', 'Plan', 'Understand the goal'], ['02', 'Approve', 'Keep purchasing accountable'], ['03', 'Act + verify', 'Prove the business outcome']];
  labels.forEach(([n, title, body], i) => {
    const y = 1.95 + i * 1.42;
    s.rect(8.7, y, 4.02, 1.16, C.darkCard);
    s.text(n, 8.92, y + 0.2, 0.55, 0.4, { size: 18, bold: true, color: C.orange });
    s.text(title, 9.65, y + 0.18, 2.82, 0.4, { size: 20, bold: true, color: C.white });
    s.text(body, 9.65, y + 0.65, 2.84, 0.36, { size: 11.5, color: C.light });
    if (i < 2) s.line(10.7, y + 1.2, 10.7, y + 1.38, { color: C.orange, arrow: true });
  });
  s.notes('Opening: StockPilot is an agentic supply recovery workspace for small and medium businesses. When inventory runs short or supplier availability changes, it turns an operations goal into a plan, approved business actions and a verified result. The key promise is recovery with evidence, rather than another chat answer.', 20);
}
// 02 — Problem
{
  const s = new Page('Urgent orders turn into a coordination problem.', 'The problem');
  s.text('For operations managers, inventory coordinators and purchasing approvers.', 0.62, 1.61, 11.6, 0.42, { size: 17, color: C.muted });
  s.card(0.6, 2.35, 3.9, 2.8, 'Inventory is short', 'Orders need 30 units.\nOnly 8 are on hand.\nThe shortfall must be sourced.', { accent: C.teal, size: 17 });
  s.card(4.72, 2.35, 3.9, 2.8, 'Suppliers change', 'Price, stock and lead time can change while a purchase is waiting for approval.', { accent: C.orange, size: 17 });
  s.card(8.84, 2.35, 3.9, 2.8, 'Decisions need control', 'Budgets, deadlines and approvals must stay consistent with the latest business state.', { accent: C.green, size: 17 });
  s.rect(0.6, 5.65, 12.14, 0.82, C.navy);
  s.text('The gap: one accountable workflow across inventory, procurement and verification.', 0.86, 5.9, 11.58, 0.43, { size: 19, bold: true, color: C.white });
  s.notes('Explain the business problem using the demo inputs: two urgent orders need thirty sensor units, but inventory has only eight. The manager needs to compare suppliers, respect the deadline and budget, obtain approval and avoid buying against a stale quote. These are coordinated business decisions, not simply a question-answering task. Do not invent time savings or market-size statistics.', 25);
}
// 03 — Solution
{
  const s = new Page('One goal in. A verified recovery plan out.', 'The solution');
  s.rect(0.6, 1.88, 12.14, 1.53, C.white, C.border);
  s.text('“Recover both urgent sensor orders within four days. Reserve available stock,\npurchase only the shortfall, verify allocations and publish a report.”', 0.89, 2.18, 11.45, 1.0, { size: 21, bold: true });
  s.pill('SCOPE: TWO ORDERS', 0.65, 3.71, 2.55);
  s.pill('BUDGET: $1,500', 3.4, 3.71, 2.25, C.paleOrange, C.ink);
  s.pill('DEADLINE: 4 DAYS', 5.85, 3.71, 2.6);
  [['Understand', 'Read current records'], ['Plan', 'Delegate specialist work'], ['Act', 'Use controlled tools'], ['Prove', 'Verify and report']].forEach(([title, body], i) => {
    const x = 0.6 + i * 3.12;
    s.rect(x, 4.53, 2.8, 1.35, C.navy);
    s.text(title, x + 0.18, 4.75, 2.44, 0.4, { size: 21, bold: true, color: C.white });
    s.text(body, x + 0.18, 5.34, 2.44, 0.3, { size: 12, color: C.light });
    if (i < 3) s.line(x + 2.85, 5.2, x + 3.08, 5.2, { arrow: true, color: C.teal });
  });
  s.text('The goal guides planning. Explicit scope, budget and deadline remain authoritative.', 0.64, 6.29, 12, 0.37, { size: 15, color: C.muted });
  s.notes('Describe the input: a natural-language goal plus explicit order scope, maximum budget and deadline. Gemini interprets the goal and plans specialist work. The backend keeps those constraints authoritative. The output is an executed and verified allocation plan with evidence. In this MVP, purchasing changes an internal sandbox ledger; it does not place an external supplier order or send a payment.', 25);
}
// 04 — Agents
{
  const s = new Page('Six roles. One coordinated workflow.', 'Agentic architecture');
  s.rect(3.43, 1.87, 6.47, 1.05, C.navy);
  s.text('Orchestrator', 3.7, 2.04, 5.93, 0.35, { size: 22, bold: true, color: C.white, align: 'center' });
  s.text('Interprets the goal • Delegates • Revises the plan', 3.7, 2.56, 5.93, 0.26, { size: 12, color: C.light, align: 'center' });
  s.line(6.67, 2.96, 6.67, 3.24, { color: C.teal });
  s.line(1.75, 3.24, 11.6, 3.24, { color: C.teal });
  const roles = [['Research', 'Read inventory, orders, suppliers and memory.'], ['Analysis', 'Compare cost, availability and arrival feasibility.'], ['Execution', 'Reserve, purchase and allocate within policy.'], ['Verification', 'Check evidence and block invalid completion.'], ['Communication', 'Publish the final operations report.']];
  roles.forEach(([title, body], i) => {
    const x = 0.6 + i * 2.46;
    s.line(x + 1.15, 3.24, x + 1.15, 3.53, { color: C.teal, arrow: true });
    s.card(x, 3.56, 2.3, 2.26, title, body, { size: 14, titleSize: 15.5, accent: i === 2 ? C.orange : C.teal });
  });
  s.text('Scoped Gemini invocations + structured contracts + durable, sequential handoffs.', 0.68, 6.25, 11.9, 0.42, { size: 17, color: C.muted, align: 'center' });
  s.notes('These are six scoped agent roles coordinated by one durable engine, not six separate servers. The orchestrator plans; research reads; analysis compares; execution proposes domain mutations; verification checks evidence; communication publishes the report. Every role has an explicit structured contract and limited tools. The handoffs are sequential so business mutations remain consistent and auditable.', 20);
}
// 05 — Lifecycle
{
  const s = new Page('From goal to action — with a recovery loop.', 'How it works');
  const steps = [
    ['01', 'Set the goal', 'Orders, budget and deadline'], ['02', 'Create a plan', 'Delegate scoped specialist steps'],
    ['03', 'Run real tools', 'Read, reserve and compare'], ['04', 'Pause for approval', 'Bind the exact purchase request'],
    ['05', 'Observe a change', 'Stale supplier quote is rejected'], ['06', 'Revise the plan', 'Use current state and memory'],
    ['07', 'Verify the outcome', 'Allocations, spend and arrival'], ['08', 'Publish evidence', 'Report, audit and completion'],
  ];
  steps.forEach(([n, title, body], i) => {
    const column = i < 4 ? i : 7 - i, x = 0.6 + column * 3.12, y = i < 4 ? 2.05 : 4.43;
    const color = i === 3 ? C.orange : i === 4 ? C.red : C.teal;
    s.rect(x, y, 2.78, 1.62, i === 4 ? C.paleRed : C.white, C.border);
    s.text(n, x + 0.19, y + 0.18, 0.46, 0.35, { size: 18, bold: true, color });
    s.text(title, x + 0.19, y + 0.65, 2.4, 0.38, { size: 15.5, bold: true });
    s.text(body, x + 0.19, y + 1.13, 2.4, 0.38, { size: 11.5, color: C.muted });
  });
  for (let i = 0; i < 3; i++) {
    s.line(3.42 + i * 3.12, 2.86, 3.67 + i * 3.12, 2.86, { arrow: true, color: C.teal });
    s.line(3.67 + i * 3.12, 5.25, 3.42 + i * 3.12, 5.25, { arrow: true, color: C.teal });
  }
  s.line(11.35, 3.72, 11.35, 4.35, { arrow: true, color: C.red });
  s.text('Changed-state failures feed fresh observations into a new plan; committed actions persist.', 0.66, 6.43, 12, 0.34, { size: 14, color: C.muted });
  s.notes('Walk through the loop. The user sets the goal and constraints. The orchestrator produces a plan, specialists execute real tools, and a high-risk purchase pauses for approval. In the recovery demo, stock changes before approval. Quote-version checks reject the stale request. That observation and supplier-failure memory drive a new plan. The system preserves existing reservations, buys only the remaining shortfall, verifies the result and publishes evidence. A supplier change is a demonstrated recovery branch, not mandatory in every workflow.', 25);
}
// 06 — Architecture
{
  const s = new Page('AI reasoning meets a durable execution engine.', 'Technical architecture');
  const nodes = [
    [0.6, 2.06, 2.5, 'React workspace', 'Vite • MUI • live polling'], [3.76, 2.06, 2.5, 'Express API', 'JWT • tenant-scoped REST'],
    [6.92, 2.06, 2.5, 'MongoDB Atlas', 'Ledger • approvals • evidence'], [10.08, 2.06, 2.66, 'Persistent memory', 'Plans • verified supplier failures'],
    [0.6, 4.12, 2.5, 'Workflow engine', 'Leases • retries • plan history'], [3.76, 4.12, 2.5, 'Gemini + roles', 'Structured plans and actions'],
    [6.92, 4.12, 2.5, 'Policy gateway', 'Schema • scope • approvals'], [10.08, 4.12, 2.66, 'Domain tools', 'Atomic business mutations'],
  ];
  nodes.forEach(([x, y, w, title, body]) => {
    s.rect(x, y, w, 1.1, y > 4 ? C.navy : C.white, y > 4 ? undefined : C.border);
    s.text(title, x + 0.16, y + 0.18, w - 0.32, 0.35, { size: 15.5, bold: true, color: y > 4 ? C.white : C.ink });
    s.text(body, x + 0.16, y + 0.72, w - 0.32, 0.29, { size: 10.5, color: y > 4 ? C.light : C.muted });
  });
  for (let i = 0; i < 3; i++) {
    s.line(3.15 + i * 3.16, 2.61, 3.7 + i * 3.16, 2.61, { arrow: true, color: C.teal });
    s.line(3.15 + i * 3.16, 4.67, 3.7 + i * 3.16, 4.67, { arrow: true, color: C.teal });
  }
  s.line(5.0, 3.21, 5.0, 3.55, { color: C.muted });
  s.line(5.0, 3.55, 1.85, 3.55, { color: C.muted });
  s.line(1.85, 3.55, 1.85, 4.05, { arrow: true, color: C.muted });
  s.line(11.4, 4.06, 11.4, 3.54, { color: C.green });
  s.line(11.4, 3.54, 8.17, 3.54, { color: C.green });
  s.line(8.17, 3.54, 8.17, 3.21, { arrow: true, color: C.green });
  s.line(11.4, 5.28, 11.4, 5.8, { color: C.orange });
  s.line(11.4, 5.8, 1.85, 5.8, { color: C.orange });
  s.line(1.85, 5.8, 1.85, 5.28, { arrow: true, color: C.orange });
  s.text('Tool observations → bounded recovery → revised plan', 3.17, 6.08, 7.0, 0.38, { size: 15, color: C.muted, align: 'center' });
  s.notes('The frontend reads real persisted state through authenticated REST endpoints. One Express process runs the API and a leased workflow worker. Gemini produces structured plans and actions, validated by full Zod schemas and tool contracts. The policy gateway enforces permissions and business rules before tools mutate Atlas. Task state, approvals, executions, audit and memory are persistent. Optional native OpenAI support exists, but the verified run uses Gemini 3.5 Flash Lite. There is no runtime fixture fallback.', 20);
}
// 07 — Guardrails
{
  const s = new Page('AI proposes. The backend enforces.', 'Controlled autonomy');
  s.card(0.6, 1.9, 5.92, 2.03, 'Role + scope permissions', 'Agents receive only approved tools and owned order/SKU scope.', { size: 18 });
  s.card(6.82, 1.9, 5.92, 2.03, 'Structured input validation', 'Exact tool schemas and grounded memory IDs are checked before execution.', { size: 18 });
  s.card(0.6, 4.18, 5.92, 2.03, 'Exact-action approvals', 'Cumulative purchasing above $250 pauses for a persisted decision.', { size: 18, accent: C.orange });
  s.card(6.82, 4.18, 5.92, 2.03, 'Fresh business invariants', 'Quote version, budget, uncovered demand and deadline are rechecked.', { size: 18, accent: C.green });
  s.text('JWT + tenant ownership     Backend-only keys     Atomic writes + replay receipts', 0.68, 6.47, 12, 0.3, { size: 13.5, color: C.muted, align: 'center' });
  s.notes('The model cannot grant itself permission. Every action crosses a backend boundary: permitted role, strict input schema, owned scope and current workflow state. Cumulative purchases above two hundred fifty dollars require approval, preventing split-purchase bypass. The saved approval binds the exact validated request. Execution still rechecks fresh quotes, budget, remaining demand and deadline. Atomic ledger updates and replay receipts prevent duplicate effects after interruptions. Keys remain on the backend.', 20);
}
// 08 — Demo
{
  const s = new Page('The demo: recover when the supplier changes.', 'Live recovery scenario', { source: sourceLive });
  s.pill('30 NEEDED', 0.64, 1.8, 2.0);
  s.pill('8 ON HAND', 2.82, 1.8, 2.0);
  s.pill('22 TO SOURCE', 5.0, 1.8, 2.4, C.paleOrange, C.ink);
  s.pill('4-DAY DEADLINE', 7.58, 1.8, 2.68);
  s.card(0.6, 2.7, 3.7, 2.6, 'Plan A: supplier A', '22 × $30 = $660\n2-day lead time\nPurchase awaits approval.', { size: 17, accent: C.orange });
  s.card(4.81, 2.7, 3.7, 2.6, 'Quote changed', 'Supplier stock is withdrawn.\nThe approved stale quote fails: QUOTE_CHANGED.', { size: 17, accent: C.red, fill: C.paleRed });
  s.card(9.02, 2.7, 3.7, 2.6, 'Plan B: supplier B', '22 × $36 = $792\n3-day lead time\nFresh approval → commit.', { size: 17, accent: C.green, fill: C.pale });
  s.line(4.36, 4, 4.75, 4, { arrow: true, color: C.orange });
  s.line(8.57, 4, 8.96, 4, { arrow: true, color: C.green });
  s.rect(0.6, 5.77, 12.14, 0.78, C.navy);
  s.text('8 reserved + 22 scheduled = 30 allocated units. Budget and deadline checks pass.', 0.9, 5.98, 11.54, 0.46, { size: 19, bold: true, color: C.white });
  s.notes('This is the strongest demo moment. After reserving eight units, supplier A initially appears feasible at six hundred sixty dollars. While the purchase waits for approval, the acceptance script withdraws its real sandbox stock. The stale approved request fails quote-version validation. The model replans using current data and memory, then proposes twenty-two units from supplier B for seven hundred ninety-two dollars. A second exact approval allows purchase commitment and allocations. Supplier C is cheaper but its nine-day lead time misses the four-day deadline. CLI approvals used explicit --approve-sandbox consent; do not present those as human clicks in a recorded walkthrough.', 30);
}
// 09 — Results
{
  const s = new Page('Measured execution. A verified outcome.', 'Acceptance results', { source: 'Source: LIVE_ACCEPTANCE.md + VERIFICATION.md • One controlled live scenario, not a population benchmark' });
  [['30 / 30', 'Units allocated'], ['$792', 'Within $1,500 budget'], ['3m 15.7s', 'Actual wall-clock time'], ['2', 'Accepted plan revisions']].forEach(([value, label], i) => {
    const x = 0.6 + i * 3.12;
    s.rect(x, 1.86, 2.78, 1.17, C.white, C.border);
    s.text(value, x + 0.19, 2.05, 2.4, 0.53, { size: 28, bold: true, color: C.teal });
    s.text(label, x + 0.19, 2.68, 2.4, 0.27, { size: 11.5, color: C.muted });
  });
  const iw = 6.75, ih = iw / analytics.ratio;
  s.image(analytics, 0.6, 3.34, iw, ih);
  s.text('Live API-derived analytics', 0.62, 3.34 + ih + 0.1, 6.7, 0.25, { size: 10, color: C.muted });
  s.text('The acceptance proved', 7.68, 3.39, 4.85, 0.45, { size: 23, bold: true });
  s.text('Real plans and tool mutations\nTwo persisted approvals\nStale-quote recovery\nIndependent checks + final report', 7.68, 4.12, 4.78, 1.7, { size: 17, color: C.muted, spacing: 1.5 });
  s.pill('37 BACKEND TESTS', 7.68, 6.06, 2.7);
  s.pill('2 UI TESTS', 10.56, 6.06, 2.04);
  s.notes('The real Gemini and Atlas workflow completed in exactly 195,706 milliseconds: three minutes and 15.706 seconds. All thirty requested units were allocated, and the commitment was seven hundred ninety-two dollars within the fifteen-hundred-dollar budget. Two accepted plan revisions and two persisted approval decisions are in the evidence. Analytics report ninety percent automation and ninety point nine percent tool success for this isolated account: ten successful tool attempts and one genuine induced stale-quote failure. These are single-run measurements, not generalized performance claims. Thirty-seven backend tests and two fixture-backed desktop/mobile browser tests also passed. Completion is scheduled/allocated fulfillment, not delivery.', 25);
}
// 10 — Product
{
  const s = new Page('Every decision leaves visible evidence.', 'The connected product', { source: 'Actual screenshot: docs/screenshots/workflow-live-gemini.png • Completed Gemini/Atlas task' });
  const iw = 8.55, ih = iw / workflow.ratio;
  s.rect(0.59, 1.83, iw + 0.02, ih + 0.02, C.white, C.border);
  s.image(workflow, 0.6, 1.84, iw, ih);
  s.card(9.42, 1.84, 3.32, 1.45, 'Plans + history', 'Inspect revisions and handoffs.', { size: 13, titleSize: 17 });
  s.card(9.42, 3.54, 3.32, 1.45, 'Actions + approvals', 'See exact inputs and results.', { size: 13, titleSize: 16 });
  s.card(9.42, 5.24, 3.32, 1.45, 'Audit + exports', 'Trace and export the outcome.', { size: 13, titleSize: 17 });
  s.notes('This image comes from the normal React application reading the actual completed live task from Atlas, not a mockup or fixture screenshot. Show the completed status and plan version two, then explain the tool and agent tabs, approval center, history and execution trail. The product also includes business context, analytics, audit and JSON evidence export. During a live demo, open localhost port 5173 and use a fresh account so earlier allocations do not remove the deficit.', 25);
}
// 11 — Value and roadmap
{
  const s = new Page('Less coordination. More accountability.', 'Business value + next steps');
  s.card(0.6, 1.88, 3.9, 2.43, 'Operations', 'Coordinate stock, quotes and allocation in one live workflow.', { size: 18 });
  s.card(4.72, 1.88, 3.9, 2.43, 'Purchasing', 'Keep high-risk commitments bound to an exact decision.', { size: 18, accent: C.orange });
  s.card(8.84, 1.88, 3.9, 2.43, 'Audit', 'Trace model decisions to actual actions and verified outcomes.', { size: 18, accent: C.green });
  s.text('Roadmap', 0.64, 4.73, 3.0, 0.48, { size: 22, bold: true });
  [['NEXT', 'Public deployment\nHosted verification + demo video'], ['THEN', 'Supplier / ERP adapters\nExternal notifications'], ['LATER', 'Multi-SKU planning\nOrganization approvals + scaling']].forEach(([label, body], i) => {
    const x = 0.6 + i * 4.12;
    s.text(label, x + 0.03, 5.45, 3.75, 0.25, { size: 10, bold: true, color: C.teal });
    s.text(body, x + 0.03, 5.92, 3.75, 0.67, { size: 14.5, color: C.muted });
  });
  s.notes('The intended value is less fragmented coordination and clearer accountability. Operations gets a shared live workflow, purchasing gets exact-action control, and audit gets evidence connecting decisions to mutations and checks. These are product benefits, not measured ROI claims. The current verified scope is a local frontend/API connected to hosted Atlas and real Gemini, executing a sandbox ledger. Next come public Render/Vercel deployment, production configuration checks and a recorded human-clicked demo. Then supplier/ERP and notification adapters, multi-SKU planning, organizational roles and high-volume scaling.', 20);
}
// 12 — Close
{
  const s = new Page('stockpilot.', 'The pitch', { dark: true, source: 'Local demo: http://localhost:5173 • Evidence: docs/LIVE_ACCEPTANCE.md' });
  s.text('Give the system a goal.\nGet an outcome you can prove.', 0.6, 2.0, 12.1, 1.66, { size: 37, bold: true, color: C.white });
  s.text('Plans adapt. Purchases stay accountable.\nBusiness outcomes are independently verified.', 0.65, 4.02, 11.7, 0.93, { size: 22, color: C.light });
  s.pill('GOAL', 0.65, 5.69, 1.75, C.darkCard, C.orange);
  s.pill('APPROVED ACTIONS', 2.82, 5.69, 3.0, C.darkCard, C.orange);
  s.pill('VERIFIED RESULT', 6.24, 5.69, 3.0, C.darkCard, C.orange);
  s.line(2.47, 5.87, 2.75, 5.87, { arrow: true, color: C.orange });
  s.line(5.9, 5.87, 6.16, 5.87, { arrow: true, color: C.orange });
  s.notes('Close: StockPilot turns goals into accountable business actions. It plans, delegates, obtains approval, adapts when a supplier changes and proves the final result. Invite the judges to inspect the live workflow, actual model/tool records and exported evidence. Transition to the application demo or questions; backup slides follow.', 10);
}
// 13 — Native model evidence
{
  const s = new Page('Backup: actual Gemini invocation records.', 'Evidence for judges', { backup: true, source: 'Actual screenshot: agents-live-gemini.png • Native @google/genai • gemini-3.5-flash-lite' });
  const iw = 7.8, ih = iw / agents.ratio;
  s.image(agents, 0.6, 1.82, iw, ih);
  s.card(8.7, 1.85, 4.03, 2.08, 'Separate scoped calls', 'Provider, model, role, revision, attempts and validated output are persisted.', { size: 16 });
  s.card(8.7, 4.2, 4.03, 2.08, 'Failures remain visible', 'Correction and recovery records are retained rather than replaced by success-only history.', { size: 16, accent: C.orange });
  s.notes('Use this slide if judges ask whether the agents are real. These are actual native Gemini invocation records displayed by the connected app. They include role, provider/model, plan revision and attempts. Failed semantic proposals can be corrected before any tool runs; their invocation records remain visible. The runtime provider factory selects native Gemini or optional native OpenAI from trusted configuration. Fixtures are loaded only by tests and visibly labeled TEST_FIXTURE_NOT_AI. Full evidence is retained in Atlas and privately exported.', 0);
}
// 14 — Tools and data
{
  const s = new Page('Backup: eight tools and persistent proof.', 'Technical detail', { backup: true, source: 'Sources: backend/src/tools/registry.js • backend/src/models/index.js • ARCHITECTURE.md' });
  const groups = [
    ['Inspect + compare', 'inspect_business\ncompare_supply'], ['Reserve + commit', 'reserve_inventory\nplace_purchase'],
    ['Allocate + verify', 'allocate_purchase\nverify_fulfillment'], ['Notify + publish', 'notify_operations\npublish_report'],
  ];
  groups.forEach(([title, body], i) => s.card(0.6 + i * 3.12, 1.88, 2.78, 2.36, title, body, { size: 13, titleSize: 16.5, accent: i === 1 ? C.orange : C.teal }));
  s.rect(0.6, 4.67, 12.14, 1.67, C.navy);
  s.text('Eight purposeful MongoDB entities', 0.9, 4.9, 11.52, 0.4, { size: 21, bold: true, color: C.white });
  s.text('User · Task · AgentExecution · ToolExecution · Approval\nWorkflowEvent · BusinessState · Memory', 0.9, 5.52, 11.52, 0.7, { size: 17, color: C.light });
  s.notes('The eight tools are actual backend functions with input/output schemas, roles and risk. Inspect business reads scoped records; compare supply calculates feasibility and memory-adjusted ranking; reserve inventory allocates on-hand stock; place purchase commits sandbox incoming supply; allocate purchase allocates it to orders; verify fulfillment reads actual ledger checks; notify operations persists in-app notifications; publish report persists an evidence-grounded report. MongoDB records users, tasks, agent/tool executions, approvals, events, domain state and memory. Quote versions, atomic CAS and receipts enforce concurrency and replay safety.', 0);
}
// 15 — Q&A
{
  const s = new Page('Backup: answers to the hard questions.', 'Judge Q&A', { backup: true });
  s.card(0.6, 1.88, 5.92, 2.15, 'Why agentic AI?', 'Goal-driven plans and tool choices adapt to observed state. The backend handles arithmetic and policy.', { size: 17 });
  s.card(6.82, 1.88, 5.92, 2.15, 'What does “completed” mean?', 'All requested supply is reserved or scheduled and allocated; checks and a report pass. Not physical delivery.', { size: 17 });
  s.card(0.6, 4.29, 5.92, 2.15, 'Can the model bypass approval?', 'No. Exact approval binding and independent backend permissions remain authoritative.', { size: 17, accent: C.orange });
  s.card(6.82, 4.29, 5.92, 2.15, 'What remains to ship?', 'Public deployment, hosted verification, demo video, external integrations and broader live evaluation.', { size: 17, accent: C.green });
  s.notes('Additional answers: planning is model-generated, not a hardcoded workflow template. Tools are allowlisted and cannot execute arbitrary code, network requests or database queries. A changed supplier quote fails even after approval because approval does not override fresh business invariants. Restart recovery uses leases, persisted state and idempotent receipts. Supplier-failure memory influences later rankings but never changes permissions. The workflow owner currently approves actions; separate organizational roles are future work. One measured successful scenario does not establish universal model reliability.', 0);
}

if (pages.length !== total) throw new Error(`Expected ${total} slides, got ${pages.length}`);
await pptx.writeFile({ fileName: path.join(here, 'StockPilot_Hackathon.pptx') });
const svgs = pages.map(page => page.render());
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>StockPilot Hackathon Presentation</title><style>
@page { size: 13.333333in 7.5in; margin: 0; } * { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #dce5ec; } .slide { width: 1280px; height: 720px; break-after: page; overflow: hidden; }
.slide:last-child { break-after: auto; } svg { display: block; width: 1280px; height: 720px; }
@media screen { body { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px; } }
</style></head><body>${svgs.map(svg => `<section class="slide">${svg}</section>`).join('')}</body></html>`;
await fs.writeFile(path.join(here, 'slides.html'), html);

const seconds = pages.reduce((sum, page) => sum + page.seconds, 0);
const talk = `# StockPilot — hackathon speaker notes\n\nPresent slides 1–12 in approximately ${Math.floor(seconds / 60)}m ${seconds % 60}s. Slides 13–15 are optional backup for questions. Speaker notes are also embedded in the PowerPoint.\n\n## One-sentence pitch\nStockPilot uses policy-constrained AI agents to recover urgent orders, execute approved sandbox business actions and verify the result.\n\n## Before presenting\n- Add your name/team/event to the title slide if desired.\n- Open http://localhost:5173 and verify the API health reports Gemini.\n- Use a fresh account for a new full workflow, with the seed sensor orders, $1,500 budget and four-day deadline.\n- Follow ../../DEMO_SCRIPT.md for a human-clicked demo; do not expose credentials or private exports.\n- The recorded CLI acceptance used explicit sandbox consent for two approval decisions. Distinguish it from a live human-clicked walkthrough.\n\n${pages.map(page => `## ${page.number}. ${page.title}${page.seconds ? ` — ${page.seconds}s` : ' — backup'}\n\n${page.notesText}\n`).join('\n')}\n## Evidence sources\n- ../LIVE_ACCEPTANCE.md\n- ../VERIFICATION.md\n- ../../README.md\n- ../../ARCHITECTURE.md\n- ../../SECURITY.md\n- ../../JUDGE_QA.md\n- ../screenshots/README.md\n`;
await fs.writeFile(path.join(here, 'speaker_notes.md'), talk);

// Validate the actual PowerPoint package and export the matching scene to PDF.
const archive = await JSZip.loadAsync(await fs.readFile(path.join(here, 'StockPilot_Hackathon.pptx')), { checkCRC32: true });
const parts = Object.keys(archive.files).filter(name => !archive.files[name].dir);
const slideParts = parts.filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
const noteParts = parts.filter(name => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name));
if (slideParts.length !== total || noteParts.length !== total) throw new Error('PowerPoint slide or embedded-note count mismatch');
const xmlParts = await Promise.all(parts.filter(name => /\.(xml|rels)$/.test(name)).map(async name => ({ name, xml: await archive.file(name).async('string') })));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const relationships = await page.evaluate(entries => {
    const result = [];
    for (const entry of entries) {
      const document = new DOMParser().parseFromString(entry.xml, 'application/xml');
      if (document.querySelector('parsererror')) throw new Error(`Malformed PowerPoint XML: ${entry.name}`);
      if (entry.name.endsWith('.rels')) for (const relation of document.getElementsByTagNameNS('*', 'Relationship')) {
        if (relation.getAttribute('TargetMode') !== 'External') result.push({ source: entry.name, target: relation.getAttribute('Target') });
      }
    }
    return result;
  }, xmlParts);
  for (const relation of relationships) {
    const source = relation.source === '_rels/.rels' ? '' : relation.source.replace('/_rels/', '/').slice(0, -5);
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), decodeURIComponent(relation.target)));
    if (!archive.file(target)) throw new Error(`Missing PowerPoint relationship target: ${relation.source} → ${target}`);
  }
  await page.goto(`file://${path.join(here, 'slides.html')}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(here, 'StockPilot_Hackathon.pdf'), preferCSSPageSize: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
} finally { await browser.close(); }
const pdf = await fs.readFile(path.join(here, 'StockPilot_Hackathon.pdf'));
const pdfPages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
if (pdfPages !== total) throw new Error(`Expected ${total} PDF pages, got ${pdfPages}`);

// Preview images use exactly the same scene as the PDF and editable PowerPoint.
const thumbW = 384, thumbH = 216, gap = 16, cols = 3, rows = Math.ceil(total / cols);
const composites = [];
for (let i = 0; i < svgs.length; i++) {
  const png = await sharp(Buffer.from(svgs[i])).png().toBuffer();
  await fs.writeFile(path.join(here, 'assets', `slide-${String(i + 1).padStart(2, '0')}.png`), png);
  composites.push({ input: await sharp(png).resize(thumbW, thumbH).png().toBuffer(), left: gap + (i % cols) * (thumbW + gap), top: gap + Math.floor(i / cols) * (thumbH + gap) });
}
await sharp({ create: { width: cols * thumbW + (cols + 1) * gap, height: rows * thumbH + (rows + 1) * gap, channels: 3, background: '#DCE5EC' } }).composite(composites).png().toFile(path.join(here, 'overview.png'));
await fs.writeFile(path.join(here, 'layout_report.json'), JSON.stringify({ slides: pages.length, pitchSlides: 12, backupSlides: 3, embeddedSpeakerNotes: noteParts.length, pdfPages, talkSeconds: seconds, textAdjustments: warnings, boundsChecks: 'passed', powerPointPackageChecks: 'ZIP CRC, XML syntax and internal relationships passed', source: 'Actual Gemini/Atlas acceptance 2026-10-06; public screenshots only' }, null, 2) + '\n');
console.log(`Generated ${pages.length} slides, ${Math.floor(seconds / 60)}m ${seconds % 60}s pitch notes, PPTX/PDF and preview.`);
console.log(`Output: ${here}`);
if (warnings.length) console.log(`Text fitting adjustments:\n${warnings.join('\n')}`);
