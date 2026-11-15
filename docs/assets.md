# Assets and attribution

Existing project assets are copied byte-for-byte from `docs/project/` in research revision `ac0d926f427dc8c97be3d408173349b743570ac4`. File hashes and source-relative paths are in `site/data/assets.json`.

The simulation teaser uses the frozen WC seed-42 actor, a 4 m route and a requested mean speed of 0.55 m/s. Its native standing/crouching requirements are 0.2932/0.1705 m; changes occur at 1.6 and 2.8 m. The 91-frame GIF is approximately 7.28 s, at 800 x 480 pixels. Playback follows simulation time, not measured wall-clock runtime. It is an illustrative episode, not one of the eight newly selected comparison conditions.

Red indicates reference geometry and required height; orange indicates the upcoming preview; blue is measured base motion; yellow marks a preview target. Preserve these meanings in future captures.

Figures originate from the project's historical report figure set. The detailed original illustration record is in `site/assets/reference/simulation_provenance.json`.

Pretrained walking and crouching policies are existing research inputs, not newly trained experts contributed by this release. Preserve upstream software, robot-asset and model attributions during any code extraction. Do not copy reference-site text, imagery or code without checking its license. No site-wide source/media license is selected by this initial scaffold; decide redistribution terms with the project maintainers before a public release.
