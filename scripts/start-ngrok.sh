#!/usr/bin/env bash

set -euo pipefail

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok is required; install it from https://ngrok.com/download" >&2
  exit 1
fi

# This endpoint is intentionally public. Use test data only.
exec ngrok http 127.0.0.1:8787
