#!/usr/bin/env bash

set -euo pipefail

preview_previous=${1:-}
preview_desired=${2:?desired preview commit is required}
preview_source_dir=${PREVIEW_SOURCE_DIR:-/opt/hertzbeat-preview/source}
preview_state_dir=${PREVIEW_STATE_DIR:-/opt/hertzbeat-preview/state}
preview_frontend_build=${PREVIEW_FRONTEND_BUILD:-false}
preview_frontend_changed=false

install -d -m 0755 "${preview_state_dir}"

if [[ ${preview_previous} =~ ^[0-9a-f]{40}$ ]] &&
  git -C "${preview_source_dir}" cat-file -e "${preview_previous}^{commit}" 2>/dev/null; then
  if ! git -C "${preview_source_dir}" diff --quiet "${preview_previous}" "${preview_desired}" -- web-app; then
    preview_frontend_changed=true
  fi
  if git -C "${preview_source_dir}" diff --quiet "${preview_previous}" "${preview_desired}" -- \
    web-app/package.json web-app/pnpm-lock.yaml web-app/pnpm-workspace.yaml; then
    :
  else
    pnpm --dir "${preview_source_dir}/web-app" install --frozen-lockfile
  fi
else
  preview_frontend_changed=true
fi

if [[ ${preview_frontend_build} == true && ${preview_frontend_changed} == true ]]; then
  printf '%s\n' "${preview_desired}" >"${preview_state_dir}/frontend-applying"
  preview_frontend_started_at=$(date +%s)
  if ! pnpm --dir "${preview_source_dir}/web-app" build; then
    printf '%s\n' "${preview_desired}" >"${preview_state_dir}/frontend-failed"
    exit 1
  fi
  preview_frontend_finished_at=$(date +%s)
  printf '%s\n' "${preview_desired}" >"${preview_state_dir}/frontend-active"
  printf '%s\n' "$((preview_frontend_finished_at - preview_frontend_started_at))" \
    >"${preview_state_dir}/frontend-last-seconds"
  rm -f "${preview_state_dir}/frontend-applying" "${preview_state_dir}/frontend-failed"
fi

"${preview_source_dir}/script/dev-preview/remote-backend-reload.sh" \
  "${preview_previous}" "${preview_desired}"
