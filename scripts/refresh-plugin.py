#!/usr/bin/env python3
"""Install or refresh this checkout using the installed plugin-creator helpers."""

import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--setup", action="store_true", help="Create/repair the local source link and register this checkout")
    parser.add_argument("--check", action="store_true", help="Validate the source without changing or reinstalling anything")
    parser.add_argument("--marketplace-path", type=Path, default=Path.home() / ".agents/plugins/marketplace.json")
    args = parser.parse_args()
    if args.setup and args.check:
        parser.error("--setup and --check are mutually exclusive")
    root = Path(__file__).resolve().parent.parent
    codex_dir = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
    helpers = Path(os.environ.get("CODEX_PLUGIN_CREATOR", str(codex_dir / "skills/.system/plugin-creator"))) / "scripts"
    for name in ("create_basic_plugin.py", "read_marketplace_name.py", "update_plugin_cachebuster.py"):
        if not (helpers / name).is_file():
            raise ValueError("Set CODEX_PLUGIN_CREATOR to the installed plugin-creator skill directory")
    manifest = json.loads((root / ".codex-plugin/plugin.json").read_text())
    package = json.loads((root / "package.json").read_text())
    if manifest["name"] != "bleavit-foresight" or package.get("name") != "event-contract-builder":
        raise ValueError(
            "This command must run from the event-contract-builder checkout with the "
            "bleavit-foresight plugin manifest"
        )
    marketplace = args.marketplace_path.expanduser().absolute()
    # Codex resolves the conventional `./plugins/<name>` source path from the
    # marketplace root (`$HOME` for the personal marketplace, or the repository
    # root for a repo marketplace), while the marketplace file itself lives under
    # `.agents/plugins/`.
    if marketplace.parent.name == "plugins" and marketplace.parent.parent.name == ".agents":
        marketplace_root = marketplace.parent.parent.parent
    else:
        marketplace_root = marketplace.parent
    name = manifest["name"]
    legacy_name = "event-contract-builder"
    if args.setup:
        # Use the supported scaffold helper's marketplace API without replacing
        # the existing plugin manifest with a blank scaffold.
        sys.path.insert(0, str(helpers))
        spec = importlib.util.spec_from_file_location("plugin_scaffold", helpers / "create_basic_plugin.py")
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        helper.load_validated_marketplace(marketplace, None, name, True)
        source = marketplace_root / "plugins" / name
        if source.exists() or source.is_symlink():
            if source.resolve() != root:
                raise ValueError(f"Existing source points elsewhere: {source}. Refusing to replace it.")
        else:
            source.parent.mkdir(parents=True, exist_ok=True)
            source.symlink_to(root, target_is_directory=True)
        # Clean up the source link created by older versions of this helper,
        # which incorrectly nested it below `.agents/plugins/plugins/`.
        misplaced_source = marketplace.parent / "plugins" / name
        if misplaced_source != source and misplaced_source.is_symlink() and misplaced_source.resolve() == root:
            misplaced_source.unlink()
        helper.update_marketplace_json(marketplace, None, name, "AVAILABLE", "ON_INSTALL", "Productivity", True)
        # Rename the source entry created for the previous plugin identifier when it
        # still points at this checkout. This keeps the personal marketplace free of
        # an unresolvable legacy entry while leaving unrelated entries untouched.
        payload = json.loads(marketplace.read_text())
        removed_legacy = False
        retained = []
        for entry in payload["plugins"]:
            if (
                isinstance(entry, dict)
                and entry.get("name") == legacy_name
                and entry.get("source", {}).get("source") == "local"
            ):
                legacy_source = marketplace_root / entry["source"]["path"]
                if legacy_source.resolve() == root:
                    removed_legacy = True
                    if legacy_source.is_symlink():
                        legacy_source.unlink()
                    continue
            retained.append(entry)
        if removed_legacy:
            payload["plugins"] = retained
            helper.write_json(marketplace, payload, force=True)
            # Remove the old installed copy when present. An absent installation
            # is harmless during a first-time migration.
            subprocess.run(
                [
                    "codex",
                    "plugin",
                    "remove",
                    f"{legacy_name}@{payload.get('name', 'personal')}",
                    "--json",
                ],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        # Also remove an orphaned legacy link left by an interrupted migration.
        for orphan in (
            marketplace_root / "plugins" / legacy_name,
            marketplace.parent / "plugins" / legacy_name,
        ):
            if orphan != source and orphan.is_symlink() and orphan.resolve() == root:
                orphan.unlink()
        if marketplace != Path.home() / ".agents/plugins/marketplace.json":
            subprocess.run(["codex", "plugin", "marketplace", "add", str(marketplace.parent)], check=True)
    marketplace_name = subprocess.check_output([sys.executable, str(helpers / "read_marketplace_name.py"), "--marketplace-path", str(marketplace)], text=True).strip()
    payload = json.loads(marketplace.read_text())
    entries = [entry for entry in payload["plugins"] if entry.get("name") == name]
    if len(entries) != 1 or entries[0]["source"].get("source") != "local":
        raise ValueError("Expected exactly one local marketplace entry for this plugin; run with --setup")
    source = marketplace_root / entries[0]["source"]["path"]
    if not source.exists() or source.resolve() != root:
        raise ValueError(f"Marketplace source does not resolve to this checkout: {source}. Run with --setup.")
    if args.check:
        print(f"Verified {name}@{marketplace_name}: {root}")
        return
    subprocess.run([sys.executable, str(helpers / "update_plugin_cachebuster.py"), str(root)], check=True)
    subprocess.run(["bun", "x", "--no-install", "prettier", str(root / ".codex-plugin/plugin.json"), "--write"], check=True)
    installed = json.loads(subprocess.check_output(["codex", "plugin", "add", f"{name}@{marketplace_name}", "--json"], text=True))
    cache = Path(installed["installedPath"])
    version = json.loads((root / ".codex-plugin/plugin.json").read_text())["version"]
    expected = codex_dir / "plugins/cache" / marketplace_name / name / version
    if cache.is_symlink() or cache.resolve() != expected.resolve() or cache.resolve() == root:
        raise ValueError("Unexpected installed cache location; refusing to clean it")
    # Local installation copies the source tree, including ignored development
    # files. Only prune the freshly installed cache; never change source files.
    allowed = {".codex-plugin", "skills", ".mcp.json", ".app.json", ".app.example.json", "LICENSE", "NOTICE", "DISCLAIMER.md", "README.md"}
    for path in cache.iterdir():
        if path.name not in allowed:
            if path.is_dir() and not path.is_symlink():
                shutil.rmtree(path)
            else:
                path.unlink()
    print(f"Installed {installed['pluginId']} at {cache}")
    print("Start a new Codex task to load the refreshed plugin. Refresh the ChatGPT connection separately after tool metadata changes.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
