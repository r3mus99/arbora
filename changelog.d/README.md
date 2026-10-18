# Changelog fragments

A pull request does not edit `CHANGELOG.md` or the version in `package.json`. It adds one file here instead:

`changelog.d/<kind>-<short-name>.md`, where the kind is `feature`, `visual`, `fix` or `internal`, and the file holds the
changelog entry exactly as it should appear, for example:

```
- **Divorce has its own symbol in the tree and the PDF.** A divorced marriage ends with ⚮ instead of "(div.)".
```

When the pull request is merged, the release workflow collects the fragments, picks the next version (a minor version
if there is a `feature` or `visual` fragment, a patch version otherwise), writes the new section to `CHANGELOG.md`,
bumps `package.json`, deletes the fragments, commits "Release x.y.z" and publishes the GitHub release.

A major version (2.0.0) is still a normal pull request that edits `package.json` and `CHANGELOG.md` by hand.
