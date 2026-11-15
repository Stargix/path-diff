# Evidence snapshot

## Current paired development evaluation

The snapshot was exported from completed Windows evaluations dated 2026-11-15. All ten actors were evaluated on the same conditions within each bank:

- Core: 14 geometries, three requested speeds (0.25, 0.50 and 0.85 m/s), and four posture settings, giving 168 conditions per actor.
- Repeated posture: a separate bank of 14 geometries, three requested speeds (0.35, 0.65 and 0.85 m/s), and two starting postures, giving 84 conditions per actor. Four posture changes are spaced every 0.8 m.
- Total: 2,520 actor-condition evaluations, not 2,520 independent routes.

The data retain all ten actors and all conditions. The eight selected illustrations use seed-42 actors and repeat zero by a fixed coverage rule. Selection was made after aggregate results were available, without filtering by the selected episodes' outcomes; it is not a preregistered or blinded sample and is not a new benchmark.

## Metrics

- Task success: the evaluator's joint task predicate, including arrival, terminal pose, posture and average-speed requirements.
- Adherence: task success plus active cross-track RMSE at most 0.10 m.
- Survival: no recorded physical failure through the complete 24 s horizon, including time after arrival.
- Arrival speed error: defined only for episodes reaching the goal. Its denominator must accompany an aggregate.
- Active cross-track RMSE: the evaluator's continuity-aware route projection, not global nearest-segment distance. Early failures can produce short, deceptively low-error traces.
- Height error is reported both over the active trace and outside the fixed +/-0.25 m transition region. Neither is a complete standalone task score.

Counts and fractions are primary. Seed results remain individually visible; one diffusion actor is available in this paired bank. Do not invent diffusion error bars or treat crossed conditions as independent training replications.

## Interpretation

Hierarchy is a strong baseline and achieves greater core task success and survival than the available diffusion actor. Repeated posture results depend on starting posture: diffusion has more successes for standing starts in this bank, while hierarchy has more for crouched starts and better survival. Gaussian imitation initialization improves over random weights under the tested shared refinement recipe, which was designed for BC refinement. Both arms use demonstration-derived normalization; the random arm is not wholly demonstration-free RL.

The hierarchy uses the original frozen experts, not the subsequently trained more robust walk expert. It chooses an expert and one velocity command at 5 Hz; experts act at 50 Hz. Diffusion and Gaussian controllers execute four joint actions per plan, giving 12.5 Hz replanning and 50 Hz joint targets.

New Gaussian checkpoints use fixed-budget `last.pt`; hierarchy and diffusion checkpoints were selected earlier under their own protocols. Differences between method families do not isolate a causal effect of diffusion, architecture or relabeling.

## Provenance and boundaries

`site/data/provenance.json` records content hashes and the evaluation source revision. Analysis includes an uncommitted correction to continuity-aware CTE reconstruction; its exact source hash is recorded separately. The original evaluation metrics were not changed by this analysis correction.

Historical I2R tables/figures and this development bank have different conditions and denominators. Never combine them into a single table or imply that the historical 98.4% applies to the whole new bank. Existing method and timing figures are labelled historical illustrations, not regenerated results from the new comparison.

Saved timeseries include base XY/yaw/height, speed, contact flags and task signals, but not full joint positions or full simulator states. They support trajectory and chart replay, not exact articulated-robot video reconstruction. New closed-loop video captures must carry their own run identity and metrics; matching route and seed alone does not guarantee matching trajectories.
