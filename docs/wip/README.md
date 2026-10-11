# Unfinished work (not merged)

Three passes were stopped part-way and are kept here as patches against the
commit they started from. None is merged into the game; each needs finishing
and testing before it goes in.

- `city-quests.patch` (from c77eda8): six open-world side quests in the city
  (*Last Seen at Hub Central*, *The Night Sheets*, *Scan Lines*, *The Ration
  Card*, *The Gap*, *Apples After Dark*): quest data, runtime and NPC placement;
  dialogue trees and the QA suite unfinished.
- `physics.patch` (from c77eda8): 3D loose-object physics, player movement feel,
  traffic weight and knock-downs, a physics2 test suite; untested.
- `textures.patch` (from 77f64fc): a rewrite of the procedural textures and the
  city facades; unfinished.

Apply with `git apply docs/wip/<name>.patch` on a branch from the noted commit.
