# Path Diff

Diffusion policies for route, posture and timing control.

We collect motion from pretrained walking and crouching controllers, relabel the achieved motion, train a diffusion policy by imitation and refine it with DPPO. The resulting controller receives route geometry, desired body height and a route-average speed, without a gait identifier.

This repository contains the static project page and a snapshot of development evaluation results. The page has route/model selection, recorded trajectory inspection and filtered result tables. Paired 3D video captures are pending; missing clips are explicitly marked. It is not yet a standalone training package or a deployed website.

## Contents

- `site/assets/`: existing simulation illustrations and method figures.
- `site/data/`: paired development results, selected comparison conditions and provenance.
- `docs/`: evidence definitions and asset attribution.

The research implementation is maintained in [the Isaac Lab project repository](https://github.com/Stargix/isaaclab-solo-diffusion-policies/tree/ac0d926f427dc8c97be3d408173349b743570ac4). Extraction into an independently runnable release is pending verification.

## Scope

The development comparison includes a controller selecting frozen experts, a diffusion controller refined with DPPO, and Gaussian PPO controllers with imitation or random weight initialization. Their observations, action interfaces and checkpoint selection procedures are not identical. These results do not establish that diffusion is necessary or better in every condition.

All included robot imagery is simulated. No physical-robot validation is claimed. There is no publication or acceptance claim associated with this working project title.
