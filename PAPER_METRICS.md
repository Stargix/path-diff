# Evaluation contract and remaining confirmation

## Existing evidence

The completed bank contains 3,024 attempts and twelve actors, including all
three diffusion online runs. The landing page compares the three primary
families (nine actors, 2,268 episodes); random-init PPO remains in the details.
Means are computed per actor, then equally over actors, without ± notation on
the website. Route repetitions are not training replicates. The diffusion
runs share an offline prior.

An export correction on 2026-11-18 separates terminal-task arrival from the
route-progress diagnostic: 357 arrival flags and associated conditional speed
errors changed from the original raw records, while task-pass labels and
tracking measurements remained unchanged. Provenance records the correction.

The full bank is a deployed-system comparison. Speed, posture and geometry
coverage differ between recorded demonstrations and accessible frozen experts.
Its aggregate cannot establish equal OOD difficulty or an architectural cause.
Speed-stratified results retain every attempt, including failures. The base-family
0.25/0.35 m/s subset is exploratory and post-hoc, not a fresh confirmatory test.

## Definitions and interpretation

- **Original task pass:** the frozen arrival/pose/timing/mean-height predicate.
  The height gate uses distance-weighted MAE <=4 cm after excluding 25 cm on
  each side of a change. It does not require every posture change to succeed.
- **Task + CTE gate:** original pass plus active temporal CTE RMSE <=10 cm.
  This is not a separate independent test of transition composition.
- **No physical failure over 24 seconds:** physical survival, including time
  after arrival. Stationary policies can maximize it. It is not ranked as task
  performance; it differs from failure before first arrival.
- **Active CTE and height MAE:** episode errors up to first arrival, physical
  termination or timeout, then equal episode averages within each actor.
  Available partial trajectories remain included; no unobserved tail is assigned
  zero error. Different coverage and time spent at each location limit rankings.
- **Startup:** routes are anchored before policy-controlled posture settling.
  Initial CTE differs materially by method. Full active CTE remains a legitimate
  end-to-end metric but cannot isolate steady-state tracking. Do not remove the
  first half-metre as a replacement score: reaching it is itself conditional.
- **Ordered section error:** at repeated speed 0.35 m/s, split each actual route
  into its five requested sections. Sample height at first-passage, equally spaced
  midpoint locations approximately 1 cm apart, using the original interpolation
  helper. Compute MAE against each section target, retaining its transition
  response with no exclusion margin. No values outside recorded progress are
  extrapolated. Display arrivals-only errors alongside arrival counts and sampled
  distance coverage. This is a conditional continuous diagnostic, not four-of-four
  success, temporal smoothness, or a new binary task definition.
- **Green:** largest observed pass-rate mean within the shown stratum (and ties),
  not statistical superiority. Censored errors and survival have no winner tint.

Section export is reproduced with:

```text
python site/tools/build_presentation_evidence.py --research-root ../hierarchical-experts
node site/tests/comparison_view_smoke.cjs
python -m unittest discover -s site/tests -v
```

## Before a confirmatory paper comparison

1. Recover the existing archived WC43/WC44 checkpoints and evaluate them on this
   exact bank; do not retrain merely because they were omitted from the new
   comparison. Their historical evaluations exist, but use another route bank
   and cannot supply the missing SD here. Verify checkpoint hashes, training
   prior/budget and selection metadata. One shared offline prior does not
   measure data-collection or imitation-training variability.
2. Fix a fresh paired route bank, conservative speed range, both initial postures,
   single and four-change tasks, and all-failure denominators before inspection.
   Keep geometry stress and speed extrapolation separate, with posture breakdowns.
3. Choose the intended startup estimand explicitly. End-to-end deployment should
   score initialization and its failures; isolated tracking needs an independently
   specified common physical starting state. Existing drift cannot be corrected
   post-hoc by shifting routes, deleting startup or filtering failed starts.
4. Define required posture attainment and permitted anticipation/response from
   actual task constraints and native expert oscillations. Then freeze a per-section
   criterion and require the full ordered sequence for a four-change pass. Count
   unreached sections as failures. Do not promote the current exploratory 2 cm /
   20 cm hold rule or a favourable exclusion margin to a final benchmark by default.
5. Report end-to-end pass, completion/coverage, pre-arrival physical failure,
   section-level errors and failures, and timing error with its arrival denominator.
   Keep full-horizon post-arrival stability separate. Pair descriptive route
   differences; any uncertainty must respect repeated conditions on one geometry
   and the small number of trained actors, not pool them as independent samples.
6. Only claim smoothness with direct motion/actuation measurements. Only attribute
   a difference to diffusion or multimodality with controlled ablations that address
   the other recipe/interface differences. Height tracking alone proves neither.

No simulator runs, checkpoint changes, reward changes or relabelled historical
outcomes are needed for this descriptive correction. The confirmatory steps above
remain experiments to design/run, not results created by the website.
