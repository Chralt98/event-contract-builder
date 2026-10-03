#!/usr/bin/env python3
"""Build a plugin-only archive from an explicit public asset allowlist."""

import argparse
import json
from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--mcp-url",
    default=None,
    help="Override the endpoint in mcp.production.json for the distributable ZIP",
)
args = parser.parse_args()
production_config = json.loads((root / "mcp.production.json").read_text())
production_servers = production_config.get("mcpServers")
production_server = (
    production_servers.get("bleavit-foresight")
    if isinstance(production_servers, dict)
    else None
)
if not isinstance(production_server, dict) or not isinstance(production_server.get("url"), str):
    raise ValueError("mcp.production.json must define the bleavit-foresight MCP URL")
mcp_url = args.mcp_url or production_server["url"]
legacy_manifest = json.loads((root / ".codex-plugin/plugin.json").read_text())
manifest = json.loads((root / "plugin.json").read_text())
legacy_mcp_config = json.loads((root / ".mcp.json").read_text())
mcp_config = json.loads((root / "mcp.json").read_text())
for server in legacy_mcp_config["mcpServers"].values():
    server["url"] = mcp_url
for server in mcp_config["mcpServers"].values():
    server["url"] = mcp_url
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
legacy_manifest.pop("apps", None)
openai_extension = manifest.get("extensions", {}).get("com.openai", {})
openai_extension.pop("apps", None)
(output / ".codex-plugin/plugin.json").write_text(json.dumps(legacy_manifest, indent=2) + "\n")
(output / "plugin.json").write_text(json.dumps(manifest, indent=2) + "\n")
(output / "mcp.json").write_text(json.dumps(mcp_config, indent=2) + "\n")
shutil.copytree(root / "skills", output / "skills")
(output / "assets").mkdir()
shutil.copyfile(
    root / "site/assets/foresight-icon.png",
    output / "assets/foresight-icon.png",
)
for name in (
    ".app.example.json",
    "LICENSE",
    "NOTICE",
    "THIRD_PARTY_LICENSES.md",
    "DISCLAIMER.md",
):
    shutil.copyfile(root / name, output / name)
(output / ".mcp.json").write_text(json.dumps(legacy_mcp_config, indent=2) + "\n")
archive = output.parent / f"{plugin_name}.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
    for path in sorted(output.rglob("*")):
        if path.is_file():
            bundle.write(path, path.relative_to(output))
print(archive)
