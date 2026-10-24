#!/usr/bin/env python3
"""Install or refresh this checkout in the local Codex plugin cache."""

import argparse
from datetime import datetime, timedelta, timezone
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def read_marketplace_name(marketplace, helpers):
    helper = helpers / "read_marketplace_name.py"
    if helper.is_file():
        return subprocess.check_output(
            [sys.executable, str(helper), "--marketplace-path", str(marketplace)], text=True
        ).strip()
    payload = json.loads(marketplace.read_text())
    name = payload.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ValueError(f"Marketplace has no valid name: {marketplace}")
    return name.strip()


def update_plugin_cachebuster(root, helpers, package, manifest, portable_manifest):
    previous_version = portable_manifest.get("version")
    helper = helpers / "update_plugin_cachebuster.py"
    if helper.is_file():
        subprocess.run([sys.executable, str(helper), str(root)], check=True)
        versions = {
            json.loads((root / path).read_text())["version"]
            for path in ("plugin.json", ".codex-plugin/plugin.json")
        }
        changed_versions = versions - {previous_version}
        if len(changed_versions) > 1:
            raise ValueError("Plugin version helper assigned conflicting manifest versions")
        version = next(iter(changed_versions), previous_version)
    else:
        version = previous_version

    if version == previous_version:
        base_version = package.get("version")
        if not isinstance(base_version, str) or not base_version.strip():
            raise ValueError("package.json must define a version before refreshing the plugin")
        timestamp = datetime.now(timezone.utc).replace(microsecond=0)
        while version == f"{base_version}+codex.{timestamp:%Y%m%d%H%M%S}":
            timestamp += timedelta(seconds=1)
        version = f"{base_version}+codex.{timestamp:%Y%m%d%H%M%S}"

    manifest["version"] = version
    portable_manifest["version"] = version
    (root / ".codex-plugin/plugin.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (root / "plugin.json").write_text(json.dumps(portable_manifest, indent=2) + "\n")
    return version


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--setup", action="store_true", help="Create/repair the local source link and register this checkout")
    parser.add_argument("--check", action="store_true", help="Validate the source without changing or reinstalling anything")
    connection = parser.add_mutually_exclusive_group()
    connection.add_argument(
        "--local",
        action="store_true",
        help="Install the plugin copy with MCP connection settings from mcp.local.json",
    )
    connection.add_argument(
        "--production",
        action="store_true",
        help="Install with mcp.production.json (the default)",
    )
    parser.add_argument("--marketplace-path", type=Path, default=Path.home() / ".agents/plugins/marketplace.json")
    args = parser.parse_args()
    if args.setup and args.check:
        parser.error("--setup and --check are mutually exclusive")
    root = Path(__file__).resolve().parent.parent
    codex_dir = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
    helpers = Path(os.environ.get("CODEX_PLUGIN_CREATOR", str(codex_dir / "skills/.system/plugin-creator"))) / "scripts"
    if args.setup and not (helpers / "create_basic_plugin.py").is_file():
        raise ValueError("`--setup` requires plugin-creator; set CODEX_PLUGIN_CREATOR to its installed skill directory")
    manifest = json.loads((root / ".codex-plugin/plugin.json").read_text())
    portable_manifest = json.loads((root / "plugin.json").read_text())
    package = json.loads((root / "package.json").read_text())
    connection_filename = "mcp.local.json" if args.local else "mcp.production.json"
    connection_config = json.loads((root / connection_filename).read_text())
    connection_servers = connection_config.get("mcpServers")
    connection_server = (
        connection_servers.get("bleavit-foresight")
        if isinstance(connection_servers, dict)
        else None
    )
    if not isinstance(connection_server, dict) or not isinstance(connection_server.get("url"), str):
        raise ValueError(f"{connection_filename} must define the bleavit-foresight MCP URL")
    if (
        manifest["name"] != "bleavit-foresight"
        or portable_manifest["name"] != manifest["name"]
        or portable_manifest["version"] != manifest["version"]
        or package.get("name") != "event-contract-builder"
    ):
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
        helper.update_marketplace_json(
            marketplace, None, name, "AVAILABLE", "ON_INSTALL", "Education & Research", True
        )
        if marketplace != Path.home() / ".agents/plugins/marketplace.json":
            subprocess.run(["codex", "plugin", "marketplace", "add", str(marketplace.parent)], check=True)
    marketplace_name = read_marketplace_name(marketplace, helpers)
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
    plugin_manifest_path = root / ".codex-plugin/plugin.json"
    portable_manifest_path = root / "plugin.json"
    original_plugin_manifest = plugin_manifest_path.read_text()
    original_portable_manifest = portable_manifest_path.read_text()
    try:
        # Give the local Codex cache a unique version without changing the
        # public SemVer kept in the source manifests and release ZIP.
        version = update_plugin_cachebuster(
            root, helpers, package, manifest, portable_manifest
        )
        subprocess.run(
            [
                "bun",
                "x",
                "--no-install",
                "prettier",
                str(plugin_manifest_path),
                str(portable_manifest_path),
                "--write",
            ],
            check=True,
        )
        installed = json.loads(
            subprocess.check_output(
                ["codex", "plugin", "add", f"{name}@{marketplace_name}", "--json"],
                text=True,
            )
        )
    finally:
        plugin_manifest_path.write_text(original_plugin_manifest)
        portable_manifest_path.write_text(original_portable_manifest)

    cache = Path(installed["installedPath"])
    expected = codex_dir / "plugins/cache" / marketplace_name / name / version
    if (
        cache.is_symlink()
        or cache.resolve() != expected.resolve()
        or cache.resolve() == root
    ):
        raise ValueError("Unexpected installed cache location; refusing to clean it")
    # Local installation copies the source tree, including ignored development
    # files. Only prune the freshly installed cache.
    allowed = {
        ".codex-plugin",
        "plugin.json",
        "mcp.json",
        "mcp.production.json",
        "mcp.local.json",
        "skills",
        "assets",
        ".mcp.json",
        ".app.json",
        ".app.example.json",
        "LICENSE",
        "NOTICE",
        "THIRD_PARTY_LICENSES.md",
        "DISCLAIMER.md",
        "README.md",
        "GLOSSARY.md",
    }
    for path in cache.iterdir():
        if path.name not in allowed:
            if path.is_dir() and not path.is_symlink():
                shutil.rmtree(path)
            else:
                path.unlink()
    for config_name in ("mcp.json", ".mcp.json"):
        config_path = cache / config_name
        config = json.loads(config_path.read_text())
        server = config["mcpServers"][name]
        # Desktop 0.163 rejects portable per-server extensions. OAuth uses
        # server discovery locally; public packaging retains the auth metadata.
        desktop_server = {**connection_server, "type": server["type"]}
        desktop_server.pop("extensions", None)
        config["mcpServers"][name] = desktop_server
        config_path.write_text(json.dumps(config, indent=2) + "\n")
    icon_source = root / "site/assets/foresight-icon.png"
    icon_destination = cache / "assets" / icon_source.name
    icon_destination.parent.mkdir(exist_ok=True)
    shutil.copyfile(icon_source, icon_destination)
    installed_config = json.loads((cache / "mcp.json").read_text())
    installed_url = installed_config["mcpServers"][name]["url"]
    print(f"Installed {installed['pluginId']} at {cache} (MCP: {installed_url})")
    print("Start a new Codex task to load the refreshed plugin. Refresh the ChatGPT connection separately after tool metadata changes.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
