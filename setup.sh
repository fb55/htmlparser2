#!/usr/bin/env bash
set -euo pipefail

# Minimal auto-setup:
# - Install gh (GitHub CLI) if missing
# - Create repo badirnajjar/main if absent
# - Add Swift+Python submodules
# - Commit and push

GH_USER="badirnajjar"
GH_REPO="main"
BRANCH="master"       # adjust if you want 'main' branch
VISIBILITY="private"  # or public

say(){ printf "\n== %s ==\n" "$*"; }
need(){ command -v "$1" >/dev/null 2>&1; }

# 1) Ensure git
need git || { echo "git not installed"; exit 1; }

# 2) Install gh if missing
if ! need gh; then
  say "Installing GitHub CLI"
  if [[ "$(uname)" == "Darwin" ]]; then
    if ! need brew; then
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || true)"
      eval "$(/usr/local/bin/brew shellenv 2>/dev/null || true)"
    fi
    brew install gh
  else
    # Get the latest release info
    LATEST_RELEASE=$(curl -s https://api.github.com/repos/cli/cli/releases/latest | grep -o '"tag_name": "v[^"]*' | cut -d'"' -f4 | sed 's/^v//')
    
    # Determine architecture
    ARCH=$(uname -m)
    case $ARCH in
      x86_64) ARCH="amd64" ;;
      aarch64) ARCH="arm64" ;;
      armv7l) ARCH="armv6" ;;
    esac
    
    # Download and install
    curl -fsSL "https://github.com/cli/cli/releases/download/v${LATEST_RELEASE}/gh_${LATEST_RELEASE}_linux_${ARCH}.tar.gz" -o /tmp/gh.tgz
    tar -xzf /tmp/gh.tgz -C /tmp
    GH_BIN="gh_${LATEST_RELEASE}_linux_${ARCH}/bin/gh"
    install "/tmp/${GH_BIN}" /usr/local/bin/gh || sudo install "/tmp/${GH_BIN}" /usr/local/bin/gh
  fi
fi

# 3) Check gh authentication
if ! gh auth status >/dev/null 2>&1; then
  say "GitHub CLI is not authenticated"
  echo "Please run: gh auth login -h github.com -p https -w"
  echo "Then re-run this script"
  exit 1
fi

# 4) Create repo if missing
if ! gh repo view "${GH_USER}/${GH_REPO}" >/dev/null 2>&1; then
  say "Creating GitHub repo ${GH_USER}/${GH_REPO}"
  gh repo create "${GH_USER}/${GH_REPO}" --"${VISIBILITY}" --source=. --remote=origin --push
fi

# 5) Clone locally if not present
if [ ! -d "${GH_REPO}/.git" ]; then
  git clone "https://github.com/${GH_USER}/${GH_REPO}.git"
fi
cd "$GH_REPO"

# 6) Ensure branch exists
git fetch origin || true
git switch -C "$BRANCH" || git checkout "$BRANCH" || true

# 7) Add submodules
add_submodule() {
  local url="$1" path="$2"
  if [ -d "$path/.git" ] || [ -e "$path" ]; then
    echo "exists: $path"
  else
    git submodule add "$url" "$path" || true
  fi
}

mkdir -p external external-py
# Swift
add_submodule https://github.com/apple/swift-openapi-generator external/swift-openapi-generator
add_submodule https://github.com/swiftlang/swift-syntax         external/swift-syntax
add_submodule https://github.com/krzysztofzablocki/Sourcery     external/Sourcery
add_submodule https://github.com/SwiftGen/SwiftGen              external/SwiftGen
add_submodule https://github.com/swiftlang/swift-format         external/swift-format
# Python
add_submodule https://github.com/openai/openai-python           external-py/openai-python
add_submodule https://github.com/tiangolo/fastapi               external-py/fastapi
add_submodule https://github.com/encode/httpx                   external-py/httpx
add_submodule https://github.com/pydantic/pydantic              external-py/pydantic
add_submodule https://github.com/encode/uvicorn                 external-py/uvicorn

git submodule update --init --recursive

# 8) Commit & push
git add .gitmodules external external-py || true
if ! git diff --cached --quiet; then
  git commit -m "Add Swift+Python submodules"
  git push origin "$BRANCH"
else
  echo "No changes to commit"
fi

say "Done. Repo: https://github.com/${GH_USER}/${GH_REPO} Branch: ${BRANCH}"