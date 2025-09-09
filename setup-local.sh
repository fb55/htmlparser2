#!/usr/bin/env bash
set -euo pipefail

# Local setup version - works without GitHub authentication
# Creates a local git repository with submodules

GH_USER="badirnajjar"
GH_REPO="main"
BRANCH="master"

say(){ printf "\n== %s ==\n" "$*"; }
need(){ command -v "$1" >/dev/null 2>&1; }

# 1) Ensure git
need git || { echo "git not installed"; exit 1; }

# 2) Create local repository
if [ ! -d "${GH_REPO}/.git" ]; then
  say "Creating local repository ${GH_REPO}"
  mkdir -p "$GH_REPO"
  cd "$GH_REPO"
  git init
  git checkout -b "$BRANCH"
else
  cd "$GH_REPO"
fi

# 3) Add submodules
add_submodule() {
  local url="$1" path="$2"
  if [ -d "$path/.git" ] || [ -e "$path" ]; then
    echo "exists: $path"
  else
    say "Adding submodule: $path"
    git submodule add "$url" "$path" || true
  fi
}

mkdir -p external external-py

# Swift submodules
add_submodule https://github.com/apple/swift-openapi-generator external/swift-openapi-generator
add_submodule https://github.com/swiftlang/swift-syntax         external/swift-syntax
add_submodule https://github.com/krzysztofzablocki/Sourcery     external/Sourcery
add_submodule https://github.com/SwiftGen/SwiftGen              external/SwiftGen
add_submodule https://github.com/swiftlang/swift-format         external/swift-format

# Python submodules
add_submodule https://github.com/openai/openai-python           external-py/openai-python
add_submodule https://github.com/tiangolo/fastapi               external-py/fastapi
add_submodule https://github.com/encode/httpx                   external-py/httpx
add_submodule https://github.com/pydantic/pydantic              external-py/pydantic
add_submodule https://github.com/encode/uvicorn                 external-py/uvicorn

# Initialize submodules
git submodule update --init --recursive

# 4) Initial commit
git add .gitmodules external external-py || true
if ! git diff --cached --quiet; then
  git commit -m "Add Swift+Python submodules"
else
  echo "No changes to commit"
fi

say "Done. Local repository created in: $(pwd)"
echo ""
echo "To push to GitHub later:"
echo "1. Create repository at https://github.com/${GH_USER}/${GH_REPO}"
echo "2. Run: git remote add origin https://github.com/${GH_USER}/${GH_REPO}.git"
echo "3. Run: git push -u origin ${BRANCH}"