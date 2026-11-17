# Path Diff

Diffusion policies for route, posture and timing control.

We collect motion from pretrained walking and crouching controllers, relabel the achieved motion, train a diffusion policy by imitation and refine it with DPPO. The resulting controller receives route geometry, desired body height and a route-average speed, without a gait identifier.

This repository contains the [project page](https://stargix.github.io/path-diff/) and a traceable snapshot of simulation development results. It presents the method, paired closed-loop videos, imitation/refinement experiments, temporal-input diagnostics and comparisons with frozen experts and Gaussian BC + PPO. Videos are individual executions, not replays of the aggregate evaluation traces. The research implementation remains in the linked Isaac Lab repository; this is not a standalone training release.

## Contents

- `site/assets/`: existing simulation illustrations and method figures.
- `site/data/`: paired development results, selected comparison conditions and provenance.
- `docs/`: evidence definitions and asset attribution.

The research implementation is maintained in [the Isaac Lab project repository](https://github.com/Stargix/isaaclab-solo-diffusion-policies/tree/ac0d926f427dc8c97be3d408173349b743570ac4). Extraction into an independently runnable release is pending verification.

## Scope

The data contain 3,024 episodes from twelve actors (three online runs per controller family). The three primary families account for 2,268 episodes. The landing page separates 432 conservative-request episodes from that broader bank, which remains available on the details page with every speed/profile breakdown. Random-init PPO is a separate reference. Training support, decision rates and checkpoint selection differ; these results characterize the systems, not the causal effect of diffusion alone.

## Local checks

From this repository, run `node --test site/tests/evidence.test.cjs` to check completeness, task identities, aggregate results, arrival semantics and plotted run coverage. Preview with `python site/tools/serve.py --port 8765`.

GitHub Pages serves the contents of `site/` from the root of the `gh-pages` branch, with `.nojekyll` and relative asset paths. It does not require GitHub Actions; the obsolete deployment workflow has been removed.

All included robot imagery is simulated. No physical-robot validation is claimed. There is no publication or acceptance claim associated with this working project title.
