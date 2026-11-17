# Evidence snapshot

## Current paired development evaluation

The snapshot includes completed Windows evaluations from 2026-11-15 and the WC43/WC44 completion on 2026-11-17. All twelve actors were evaluated on the same conditions within each bank:

- Core: 14 geometries, three requested speeds (0.25, 0.50 and 0.85 m/s), and four posture settings, giving 168 conditions per actor.
- Repeated posture: a separate bank of 14 geometries, three requested speeds (0.35, 0.65 and 0.85 m/s), and two starting postures, giving 84 conditions per actor. Four posture changes are spaced every 0.8 m.
- Total: 3,024 actor-condition evaluations, not 3,024 independent routes. The three primary controller families account for 2,268 episodes; random-init PPO accounts for the other 756.

The data retain all twelve actors and all conditions. The comparison videos illustrate individual runs from selected tasks, after aggregate results were available. They are not a preregistered or blinded sample and do not replace the full condition bank.

## Metrics

- Task success: the evaluator's joint task predicate, including arrival, terminal pose, posture and average-speed requirements.
- Adherence: task success plus active cross-track RMSE at most 0.10 m.
- Survival: no recorded physical failure through the complete 24 s horizon, including time after arrival.
- Arrival speed error: defined at the first terminal-task arrival. Its denominator must accompany an aggregate. The `arrived` export now uses raw `task_arrived`, while raw `route_arrived` is retained as a separate route-progress diagnostic. Earlier exports conflated them. The 2026-11-18 correction changed 357 exported arrival flags and associated arrival-speed errors, not original task-pass labels or tracking measurements; source hashes are recorded in `provenance.json`.
- Active cross-track RMSE: the evaluator's continuity-aware route projection, not global nearest-segment distance. Early failures can produce short, deceptively low-error traces.
- Height error is reported both over the active trace and outside the fixed +/-0.25 m transition region. Neither is a complete standalone task score.

Counts and fractions are primary. All three diffusion actors are now included. They share an offline prior; do not interpret them as independent BC or data-collection repetitions, or crossed task conditions as independent training replications. The website displays actor-level means without ± notation; the underlying records preserve individual runs.

## Interpretation

Hierarchy is a strong baseline with higher original core pass; diffusion has a higher core tracking-gated pass and higher original pass on the pooled repeated bank. Both conclusions are descriptive of these systems and this mixed-speed bank. Start posture, speed and metric definition matter; stricter retrospective section checks can substantially reduce either system's score. Random-init PPO uses demonstration-derived normalization and the tested refinement recipe; its result does not prove that RL from scratch cannot solve the task.

The hierarchy uses the original frozen experts, not the subsequently trained more robust walk expert. It chooses an expert and one velocity command at 5 Hz; experts act at 50 Hz. Diffusion and Gaussian controllers execute four joint actions per plan, giving 12.5 Hz replanning and 50 Hz joint targets.

New Gaussian checkpoints use fixed-budget `last.pt`; hierarchy and diffusion checkpoints were selected earlier under their own protocols. Differences between method families do not isolate a causal effect of diffusion, architecture or relabeling.

## Provenance and boundaries

`site/data/provenance.json` records content hashes and the evaluation source revision. Analysis includes an uncommitted correction to continuity-aware CTE reconstruction; its exact source hash is recorded separately. The original evaluation metrics were not changed by this analysis correction.

Historical I2R tables/figures and this development bank have different conditions and denominators. Never combine them into a single table or imply that the historical 98.4% applies to the whole new bank. Existing method and timing figures are labelled historical illustrations, not regenerated results from the new comparison.

Saved timeseries include base XY/yaw/height, speed, contact flags and task signals, but not full joint positions or full simulator states. They support trajectory and chart replay, not exact articulated-robot video reconstruction. New closed-loop video captures must carry their own run identity and metrics; matching route and seed alone does not guarantee matching trajectories.
