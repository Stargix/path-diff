# Project page

Local preview (from the repository root):

```text
python site/tools/serve.py
```

Keep the terminal open and visit `http://127.0.0.1:8765/`. The script resolves
the site directory relative to itself, so an absolute script path also works
from any directory. It binds loopback only, not the network. If the port is
already used, reuse the running preview or choose `--port 8766`.

Buildless HTML/CSS/JavaScript with local JSON data. The page explains the current method and compares four selected conditions across three controllers using new closed-loop simulation videos and their own episode metrics.

The illustration is not one of the comparison captures. `data/gallery.json` identifies each video and its metrics; the original full-bank evaluation records are separate. `tools/build_gallery.py` checks checkpoint, route condition and file hashes before importing a capture. The older `data/media.json` is retained as an archival manifest and is not used by the page.

The older single-episode trace export remains available locally through `tools/export_transition_trace.py`, but is not displayed as if it belonged to a video capture. The current comparison plots instead summarize the paired evaluation bank.

The page is organized around Path Diff under a new task interface: abstract, method, illustrative comparisons, imitation/refinement, system-level results, posture-response diagnostics, timing and scope. The snapshot retains all 3,024 episodes from twelve actors. The landing page shows nine actors across three primary families; random-init PPO is a reference on the details page. It is a development system comparison, not a shared OOD or causal-architecture ranking. There are no per-run dashboards, accordions or spreadsheet downloads. Shared aggregations in `evidence.js` are tested independently of the presentation.

`tools/export_report_content.py --source /path/to/i2r_report_final.tex` archives the original abstract, checks the transcribed report-table values and copies report figures with source hashes. Only selected supporting experiments are displayed; the project summary is curated separately. The historical single-actor held-out table and high-speed posture sweep are not presented as the main multi-method comparison.

`tools/build_presentation_evidence.py --research-root ../hierarchical-experts` derives the posture-response diagnostic from raw saved traces: four base families with 0.25 m/s core requests and 0.35 m/s repeated requests. Geometry stress and higher speeds remain in the full comparative bank. The diagnostic subset is post-hoc, not a registered final benchmark or proof of identical training support. Source hashes and actual per-plot sample counts are retained.

Four paired video comparisons retain synchronized autoplay and three equal landscape columns. Narrow screens scroll the bounded comparison row rather than expanding every video into a giant single-column block. The first example is the S-curve; repeated heights are one selectable task, not the whole page. Video descriptions state the request, rather than assigning aggregate conclusions to an individual clip.

Single-change curves are recomputed from -0.6 to +0.6 m around the actual boundary. Repeated curves retain the full 0–4 m profile and all four ordered changes, with standing and crouched starts shown separately. No same-direction event folding is used for the repeated display. Each method has one mean curve; missing tails are not filled in. These are evaluation traces, not synchronized traces of the newer captures. Future recording commands save time-series arrays alongside their videos.

The all-seed analysis remains in the local data files, not part of the presentation UI. `tools/export_transition_audit.py --audit /path/to/transition_audit.json` imports the compact output of the research repository's `scripts.research_comparison.transition_audit`. Official success is unchanged. Alternative exclusion margins and the 2 cm / 20 cm transition-attainment diagnostic remain exploratory, not a replacement benchmark or a smoothness metric. The JSON includes the source file hashes.

GitHub Pages serves `site/` from the root of the `gh-pages` branch. No Actions workflow is needed for this deployment. The site needs no build, analytics, login, backend or browser physics simulator. Relative asset paths support the project prefix.

## Metric interpretation

`PAPER_METRICS.md` defines the current reporting contract and the remaining
confirmatory experiment. The broad results retain the original predicate and
add a by-speed breakdown. Safety and partial-trajectory errors are not tinted
as performance winners. The low-speed table is accompanied by initial CTE so
startup recovery is not misrepresented as isolated steady-state tracking.

The presentation exporter also preserves five ordered section errors per
repeated route, with source task-arrival flags and observation coverage. The
website summarizes arrivals-only spatial errors explicitly, without introducing
a post-hoc binary transition-success threshold. `task_arrived` and the older
`route_arrived` field are distinct predicates; both remain in the section export.
Original episodes, task labels, checkpoints and video captures are unchanged.

Browser verification on 16 November 2026: all four comparison sets (12 videos)
loaded and autoplayed in three landscape columns; result tables and ordered
plots rendered without console errors. At 390 px the page itself did not
overflow; tables and the comparison row scroll locally. The method column is
sticky in horizontally scrolling tables. Automated checks: 14 Python tests,
the JavaScript DOM-contract smoke test, and JavaScript syntax checks. The seed
completion importer adds two further tests (16 Python tests total).

## Completing the omitted WC actors

WC43 and WC44 are already trained and have historical evaluations. They must
not be retrained or mixed into the current bank using their older route scores.
The research checkout's `scripts.research_comparison.complete_diffusion_seeds`
clones only WC42's 12 evaluation jobs for each missing actor (504 new attempts,
no training), verifying checkpoint and original route-bank hashes. Completed
jobs must match the original scenario and staging metadata exactly.

Once those jobs finish, import them with this environment's Python:

```text
python site/tools/import_completed_seeds.py --research-root ../hierarchical-experts --protocol ../hierarchical-experts/scratch/wc_seed_completion_20261116
```

The importer requires both complete matched actors, preserves original rows,
rebuilds section/transition traces and provenance, and stages all exports before
replacing website data. All displayed actor/attempt counts and mean ± SD update
from the actual imported records. Synthetic aggregation tests never write
simulated actor records to the website.
