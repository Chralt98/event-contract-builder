#!/usr/bin/env python3
"""Build a plugin-only archive from an explicit public asset allowlist."""

import json
from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / ".codex-plugin/plugin.json").read_text())
plugin_name = manifest["name"]
output = root / "out" / plugin_name
if output.exists():
    shutil.rmtree(output)
legacy_output = root / "out" / "event-contract-builder"
legacy_archive = root / "out" / "event-contract-builder.zip"
if plugin_name != "event-contract-builder":
    if legacy_output.exists():
        shutil.rmtree(legacy_output)
    if legacy_archive.exists():
        legacy_archive.unlink()
(output / ".codex-plugin").mkdir(parents=True)
# A user's local ChatGPT connection is never part of the distributable.
manifest.pop("apps", None)
(output / ".codex-plugin/plugin.json").write_text(json.dumps(manifest, indent=2) + "\n")
shutil.copytree(root / "skills", output / "skills")
for name in (".mcp.json", ".app.example.json", "LICENSE", "NOTICE", "DISCLAIMER.md"):
    shutil.copyfile(root / name, output / name)
archive = output.parent / f"{plugin_name}.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
    for path in sorted(output.rglob("*")):
        if path.is_file():
            bundle.write(path, path.relative_to(output))
print(archive)
