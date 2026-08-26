#!/usr/bin/env bash

set -euo pipefail

preview_previous=${1:-}
preview_desired=${2:?desired preview commit is required}
preview_source_dir=${PREVIEW_SOURCE_DIR:-/opt/hertzbeat-preview/source}
preview_state_dir=${PREVIEW_STATE_DIR:-/opt/hertzbeat-preview/state}
preview_backend_service=${PREVIEW_BACKEND_SERVICE:-hertzbeat-preview-backend.service}
preview_dry_run=${PREVIEW_BACKEND_DRY_RUN:-false}

install -d -m 0755 "${preview_state_dir}"

preview_full_reactor=false
preview_backend_changed=false
declare -A preview_module_set=()

if [[ ! ${preview_previous} =~ ^[0-9a-f]{40}$ ]] ||
  ! git -C "${preview_source_dir}" cat-file -e "${preview_previous}^{commit}" 2>/dev/null; then
  preview_full_reactor=true
  preview_backend_changed=true
else
  while IFS= read -r preview_path; do
    case "${preview_path}" in
      pom.xml|mvnw|mvnw.cmd|.mvn/*)
        preview_full_reactor=true
        preview_backend_changed=true
        ;;
      */pom.xml)
        preview_full_reactor=true
        preview_backend_changed=true
        ;;
      hertzbeat-*/src/*|hertzbeat-*-*/src/*)
        preview_backend_changed=true
        preview_candidate=$(dirname "${preview_path}")
        while [[ ${preview_candidate} != . && ${preview_candidate} != / ]]; do
          if [[ -f ${preview_source_dir}/${preview_candidate}/pom.xml ]]; then
            preview_module_set["${preview_candidate}"]=1
            break
          fi
          preview_candidate=$(dirname "${preview_candidate}")
        done
        ;;
    esac
  done < <(git -C "${preview_source_dir}" diff --name-only "${preview_previous}" "${preview_desired}")
fi

if [[ ${preview_backend_changed} != true ]]; then
  if [[ ${preview_dry_run} == true ]]; then
    printf 'backend=none\n'
  fi
  exit 0
fi

if [[ ${preview_dry_run} == true ]]; then
  if [[ ${preview_full_reactor} == true ]]; then
    printf 'backend=full\n'
  else
    printf 'backend=modules:'
    printf '%s\n' "${!preview_module_set[@]}" | LC_ALL=C sort | paste -sd, -
  fi
  exit 0
fi

printf '%s\n' "${preview_desired}" >"${preview_state_dir}/backend-applying"

preview_maven_args=(
  -T 1C
  -DskipTests
  -DskipITs
  -Dsurefire.failIfNoSpecifiedTests=false
  -DfailIfNoTests=false
)

if [[ ${preview_full_reactor} == true ]]; then
  preview_maven_args+=(-pl hertzbeat-startup -am install)
else
  preview_modules=$(
    printf '%s\n' "${!preview_module_set[@]}" |
      LC_ALL=C sort |
      paste -sd, -
  )
  if [[ -z ${preview_modules} ]]; then
    echo 'Backend changes were detected without a resolvable Maven module.' >&2
    exit 1
  fi
  preview_maven_args+=(-pl "${preview_modules}" -am install)
fi

preview_started_at=$(date +%s)
(
  cd "${preview_source_dir}"
  ./mvnw "${preview_maven_args[@]}"
)

systemctl restart "${preview_backend_service}"
for _ in $(seq 1 120); do
  if curl --fail --silent --show-error \
    http://127.0.0.1:1157/api/setup/status >/dev/null 2>&1; then
    preview_finished_at=$(date +%s)
    printf '%s\n' "${preview_desired}" >"${preview_state_dir}/backend-active"
    printf '%s\n' "$((preview_finished_at - preview_started_at))" \
      >"${preview_state_dir}/backend-last-seconds"
    rm -f "${preview_state_dir}/backend-applying" "${preview_state_dir}/backend-failed"
    exit 0
  fi
  sleep 2
done

printf '%s\n' "${preview_desired}" >"${preview_state_dir}/backend-failed"
echo 'Backend did not become ready after the controlled restart.' >&2
exit 1
