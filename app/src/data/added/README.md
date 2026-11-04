# Added songs

One song per file, as JSON (the app's `Song` shape), written by `scripts/add-song.mjs`.
The app opens every valid file here like the shipped songs. A file that is malformed, or
whose title is already shipped or already taken by an earlier file (by file name), is skipped.
Hand edits are allowed.
The release check counts every `.json` here as a song, so a stray or duplicate file fails `npm run check:release`.
