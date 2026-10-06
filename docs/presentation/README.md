# StockPilot hackathon presentation

## Files
- **StockPilot_Hackathon.pptx** — editable 16:9 PowerPoint, 12 pitch slides and 3 technical backup slides; speaker notes embedded.
- **StockPilot_Hackathon.pdf** — portable copy with the same content and layout.
- **speaker_notes.md** — suggested 4–5 minute talk track, demo instructions and backup answers.
- **overview.png** — contact sheet of every slide.
- **slides.html** — browser-viewable slide layout used for PDF export.
- **generate_presentation.mjs** — reproducible slide generator.
- **layout_report.json** — text/bounds fitting, PowerPoint package integrity and PDF page-count verification.

Present slides 1–12. Use slides 13–15 for questions. The deck uses actual live Gemini screenshots and measured execution evidence from `../LIVE_ACCEPTANCE.md`. Browser regression tests use labeled fixtures; those results are distinct from actual Gemini acceptance. The business ledger is a sandbox: purchasing does not send external orders or payments, and completion means reserved/scheduled supply allocated, not goods delivered.

No team name or hackathon name was supplied, so the deck uses the StockPilot product identity. Add your name, team and event on the title slide in PowerPoint if desired. Text and diagrams are editable; evidence screenshots are images.

## Regenerate
Use Node 24+ and install presentation-only dependencies in a separate directory:

```bash
npm install --prefix /tmp/omnirush/stockpilot-presentation-tools pptxgenjs sharp fontkit
PRESENTATION_TOOLS_PATH=/tmp/omnirush/stockpilot-presentation-tools node docs/presentation/generate_presentation.mjs
```

The generator also uses the project's existing Playwright dependency and its Chromium browser for PDF export. Install Chromium with `npx playwright install chromium` when needed. It uses the installed DejaVu Sans font; `PRESENTATION_FONT_REGULAR` and `PRESENTATION_FONT_BOLD` can override font file paths. PowerPoint can substitute another sans-serif font if DejaVu Sans is unavailable.

In the current restricted Linux environment, Chromium requires the previously extracted libraries:

```bash
LD_LIBRARY_PATH=/tmp/omnirush/browser-libs/usr/lib/x86_64-linux-gnu \
PRESENTATION_TOOLS_PATH=/tmp/omnirush/stockpilot-presentation-tools \
node docs/presentation/generate_presentation.mjs
```

The generator reads only public documentation screenshots; it does not load `.env`, credentials or private workflow exports. All quantitative claims refer to the verified October 6, 2026 run or the recorded test checks, not estimated ROI or production benchmarks.
