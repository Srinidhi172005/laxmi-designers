import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3000";
const OUT = "/private/tmp/claude-501/-Users-vejandlaanji-Downloads-laxmi-designers-main/9f17288f-792f-4088-a1f6-a4474440c4ed/scratchpad/audit";
fs.mkdirSync(OUT, { recursive: true });

const views = ["home", "shop", "services", "about", "contact", "admin"];
const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const report = { consoleErrors: [], pageErrors: [], failedRequests: [], overflow: [], a11y: [], notes: [] };

function log(...a) { console.log(...a); }

const browser = await chromium.launch();

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push({ vp: vp.name, url: page.url(), text: msg.text().slice(0, 300) });
  });
  page.on("pageerror", (err) => report.pageErrors.push({ vp: vp.name, url: page.url(), text: String(err).slice(0, 300) }));
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (u.startsWith(BASE) || !u.startsWith("http")) return; // ignore local hmr etc
    report.failedRequests.push({ vp: vp.name, url: u.slice(0, 160), err: req.failure()?.errorText });
  });

  for (const view of views) {
    const url = view === "home" ? BASE + "/" : `${BASE}/${view}`;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    } catch (e) {
      report.notes.push({ vp: vp.name, view, note: "goto timeout/err: " + String(e).slice(0, 120) });
      continue;
    }
    await page.waitForTimeout(1200); // let animations/data settle

    // horizontal overflow check
    const metrics = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      bodyScrollW: document.body.scrollWidth,
    }));
    if (metrics.scrollW > metrics.clientW + 1) {
      // find offending elements
      const offenders = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const bad = [];
        document.querySelectorAll("*").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > docW + 2 && r.width > 0 && r.left >= 0) {
            bad.push({ tag: el.tagName, id: el.id, cls: (el.className || "").toString().slice(0, 60), right: Math.round(r.right) });
          }
        });
        return bad.slice(0, 8);
      });
      report.overflow.push({ vp: vp.name, view, docW: metrics.clientW, scrollW: metrics.scrollW, offenders });
    }

    // basic a11y: images without alt, buttons/links without accessible name
    const a11y = await page.evaluate(() => {
      const issues = [];
      const imgsNoAlt = [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length;
      if (imgsNoAlt) issues.push(`${imgsNoAlt} img without alt`);
      const btns = [...document.querySelectorAll("button")].filter((b) => {
        const label = (b.getAttribute("aria-label") || b.textContent || "").trim();
        return label.length === 0;
      }).length;
      if (btns) issues.push(`${btns} button without accessible name`);
      const inputsNoLabel = [...document.querySelectorAll("input, select, textarea")].filter((el) => {
        if (el.type === "hidden" || el.type === "file") return false;
        const id = el.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        return !hasLabel && !el.getAttribute("aria-label") && !el.getAttribute("placeholder");
      }).length;
      if (inputsNoLabel) issues.push(`${inputsNoLabel} form field without label/aria/placeholder`);
      return issues;
    });
    if (a11y.length) report.a11y.push({ vp: vp.name, view, issues: a11y });

    // screenshot (desktop + mobile only to save)
    if (vp.name !== "tablet") {
      await page.screenshot({ path: `${OUT}/${vp.name}-${view}.png`, fullPage: false });
    }
  }
  await context.close();
}

// Interaction smoke test on desktop home
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const actions = [];
  // open search
  try { await page.click("#action-search-toggle"); await page.waitForTimeout(400); actions.push("search opened"); await page.keyboard.press("Escape"); } catch (e) { actions.push("search FAIL " + String(e).slice(0,80)); }
  // open appointment (Book Now)
  try { await page.click("#nav-link-concierge"); await page.waitForTimeout(500); const visible = await page.isVisible("#concierge-overlay"); actions.push("appointment modal visible=" + visible); await page.keyboard.press("Escape"); } catch (e) { actions.push("appointment FAIL " + String(e).slice(0,80)); }
  report.interactions = { actions, errors: errs };
  await context.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

// Print summary
log("\n===== AUDIT SUMMARY =====");
log("Console errors:", report.consoleErrors.length);
report.consoleErrors.slice(0, 12).forEach((e) => log("  [" + e.vp + "]", e.text));
log("Page errors:", report.pageErrors.length);
report.pageErrors.slice(0, 12).forEach((e) => log("  [" + e.vp + "]", e.text));
log("Failed external requests:", report.failedRequests.length);
report.failedRequests.slice(0, 12).forEach((e) => log("  [" + e.vp + "]", e.err, e.url));
log("Horizontal overflow pages:", report.overflow.length);
report.overflow.forEach((o) => { log(`  [${o.vp}/${o.view}] scrollW=${o.scrollW} vs ${o.docW}`); o.offenders.forEach((x) => log(`      <${x.tag}> #${x.id} .${x.cls} right=${x.right}`)); });
log("A11y issues:", report.a11y.length);
report.a11y.forEach((a) => log(`  [${a.vp}/${a.view}]`, a.issues.join("; ")));
log("Interactions:", JSON.stringify(report.interactions));
log("Notes:", JSON.stringify(report.notes));
log("Screenshots + report.json in", OUT);
