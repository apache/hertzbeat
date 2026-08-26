#!/usr/bin/env bash

set -euo pipefail

preview_previous=${1:-}
preview_desired=${2:?desired preview commit is required}
preview_source_dir=${PREVIEW_SOURCE_DIR:-/opt/hertzbeat-preview/source}

if [[ ${preview_previous} =~ ^[0-9a-f]{40}$ ]] &&
  git -C "${preview_source_dir}" cat-file -e "${preview_previous}^{commit}" 2>/dev/null; then
  if git -C "${preview_source_dir}" diff --quiet "${preview_previous}" "${preview_desired}" -- \
    web-app/package.json web-app/pnpm-lock.yaml web-app/pnpm-workspace.yaml; then
    :
  else
    pnpm --dir "${preview_source_dir}/web-app" install --frozen-lockfile
  fi
fi

"${preview_source_dir}/script/dev-preview/remote-backend-reload.sh" \
  "${preview_previous}" "${preview_desired}"
