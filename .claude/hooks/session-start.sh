#!/bin/bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# The @chobble/js-toolkit devDependency is provided by the chobble-template
# git submodule (file:./chobble-template/packages/js-toolkit). A fresh
# checkout does not populate submodules, so `bun install` fails with
# "ENOENT: failed opening cache/package/version dir for package
# @chobble/js-toolkit". Initialise the submodule first so the file:
# dependency can resolve.
if [ ! -e chobble-template/packages/js-toolkit/package.json ]; then
  echo "Initialising chobble-template submodule..."
  git submodule update --init --depth 1 chobble-template
fi

echo "Installing dependencies with bun..."
bun install

echo "Session setup complete."
