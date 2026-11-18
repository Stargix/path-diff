# Assets and attribution

Existing project assets are copied byte-for-byte from `docs/project/` in research revision `ac0d926f427dc8c97be3d408173349b743570ac4`. File hashes and source-relative paths are in `site/data/assets.json`.

The simulation teaser uses the frozen WC seed-42 actor, a 4 m route and a requested mean speed of 0.55 m/s. Its native standing/crouching requirements are 0.2932/0.1705 m; changes occur at 1.6 and 2.8 m. The 91-frame GIF is approximately 7.28 s, at 800 x 480 pixels. Playback follows simulation time, not measured wall-clock runtime. It is an illustrative episode, not one of the eight newly selected comparison conditions.

The page now displays a new Isaac Lab rollout of that same archived route and actor, at the same requested speed and posture boundaries, captured with the dark gallery presentation. It is a new execution, not a replay of the old GIF; the original GIF remains untouched. The page video is trimmed after arrival (SHA256 `6e60d186a6e2f96d36a563546bdb29a76d598907c988726e3ba12ee66a487fa6`); the full recreated capture is also retained (SHA256 `dff27f9ddbfc4f1e6c6e91effeebe553265b270feea450d7833cbffca893e7fc`).

Red indicates reference geometry and required height; orange indicates the upcoming preview; blue is measured base motion; yellow marks a preview target. Preserve these meanings in future captures.

Figures originate from the project's historical report figure set. The detailed original illustration record is in `site/assets/reference/simulation_provenance.json`.

The timing section redraws the selected executions from I2R figures 7 and 8 as responsive SVG plots, not screenshots. The archived PNGs remain unchanged. `site/data/timing-examples.json` records the selected scenarios, source and selection-manifest hashes, active sample arrays and plotting conventions. These are individual WC seed-42 report executions, not comparative-bank averages. No new rollouts or outcome-based reselection are performed.

Rebuild with NumPy and Matplotlib from the original research checkout (which contains the archived rollout files):

```powershell
python site/tools/build_timing_figures.py --source-root <original-research-checkout>
python site/tools/build_timing_figures.py --source-root <original-research-checkout> --theme light
```

The export preserves the original nearest-segment projection, post-step active interval through first arrival, five-sample edge-padded speed smoothing and archived active origins for schedule margin. It does not change experimental metrics. For readability, the web geometry maps use thicker traces and a shared linear colour range of ±50% around the 0.65 m/s request, rather than the report's ±100%. Colours saturate below 0.325 and above 0.975 m/s; the visible legend states these limits in m/s. The measured values remain unchanged. The web figure separates the geometry maps from the speed/margin curves; the duplicate 0.85 m/s route maps in report figure 8 are omitted.

Pretrained walking and crouching policies are existing research inputs, not newly trained experts contributed by this release. Preserve upstream software, robot-asset and model attributions during any code extraction. Do not copy reference-site text, imagery or code without checking its license. No site-wide source/media license is selected by this initial scaffold; decide redistribution terms with the project maintainers before a public release.
