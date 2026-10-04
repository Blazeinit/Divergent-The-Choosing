# assets/

Build 1 needs no files here. Every texture, character, prop, sound and music cue is generated procedurally at runtime (see `js/engine/textures.js`, `character.js`, `props.js` and `audio.js`).

These folders are reserved for authored content in later builds:

- `characters/`: glTF character meshes and animation clips
- `props/`: glTF props that can replace a procedural prop builder by name
- `textures/`: low-res PNG textures that can override a procedural painter by key
- `audio/`: recorded ambience, music stems and voiced lines

Any loader for these files should keep the procedural version as a fallback, so the game still runs from a bare checkout.
