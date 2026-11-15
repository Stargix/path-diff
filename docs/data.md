# Data files

All paths below are relative to `site/data/`. Files are UTF-8 JSON. Distances are metres, time seconds and speed metres per second unless the field name says otherwise. Convert for display without altering stored values. Missing conditional measures are `null`, not zero.

| File | Contents |
|---|---|
| `episodes.json` | All 2,520 episode records from the paired development comparison |
| `summary.json` | Twenty actor/suite/staging summaries with metric denominators |
| `actors.json` | Ten actor identities, checkpoint hashes, training seeds, execution intervals and selection procedures |
| `scenarios.json` | Eight illustrative conditions, exact reference geometry and 24 references to original traces |
| `provenance.json` | Evaluation source revision, analysis implementation and source-file hashes |
| `assets.json` | Byte hashes, dimensions-independent file identities and origins of the copied illustrations |

An episode's `key` is:

```text
[suite, staging_steps, variant, path_shape, repeat,
 requested_speed, requested_height, transition_direction]
```

Identity is `(actor, key)`, not row order. Training seed and evaluation seed are different quantities. `scenarios.json` includes the latter and the source scenario index/batch size for each displayed trace. For transition conditions, consult `transition_direction` and the reference metadata; the requested-height element alone does not identify the starting posture. Repeated profiles use the metadata's height schedule and the variant distinguishes their starting posture.

Scenario `recorded_metrics` come from the original evaluation. `video`, `poster`, `trace_export`, `capture_id` and `capture_metrics` are initially null because comparative media have not been produced. Never interpret a null video as a failed policy; it means media are absent. Do not assign original-record metrics to a new capture. See [evidence definitions](evidence.md).

The selected `reference_metadata` retains route coordinates and its posture schedule. Paths are in the evaluator's world frame. Changing viewpoint or shifting all methods by the same display transform is acceptable; changing their relative distances or route geometry is not.

To filter results, select episode records first and recompute the numerator and denominator from that set. Do not average already rounded percentages or combine the historical report tables with this bank. Counts across conditions are descriptive; they are not independent training replications.

For the table's `total_cte_m`, use the stored active RMSE. `after_half_m_cte_m` is a separately labelled diagnostic. The height scores with and without transition regions answer different questions. Arrival speed error only has a value for episodes reaching the goal.

Source archives and model weights are external to this repository. The compact JSON snapshot is not a replacement for full simulator traces, trained models or training data.
