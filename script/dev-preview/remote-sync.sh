#!/usr/bin/env bash

set -euo pipefail

preview_region=${AWS_REGION:-us-east-1}
preview_repository=${PREVIEW_REPOSITORY:-hertzbeat-preview}
preview_branch=${PREVIEW_BRANCH:-preview/zhaoqingran/main}
preview_source_dir=${PREVIEW_SOURCE_DIR:-/opt/hertzbeat-preview/source}
preview_state_dir=${PREVIEW_STATE_DIR:-/opt/hertzbeat-preview/state}
preview_remote="https://git-codecommit.${preview_region}.amazonaws.com/v1/repos/${preview_repository}"
preview_git_args=(
  -c credential.helper=
  -c "credential.helper=!aws --region ${preview_region} codecommit credential-helper \$@"
  -c credential.UseHttpPath=true
)

install -d -m 0755 "${preview_state_dir}"
exec 9>"${preview_state_dir}/sync.lock"
flock -n 9 || exit 0

preview_desired=$(
  aws codecommit get-branch \
    --region "${preview_region}" \
    --repository-name "${preview_repository}" \
    --branch-name "${preview_branch}" \
    --query branch.commitId \
    --output text
)
if [[ ! ${preview_desired} =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid desired preview commit: ${preview_desired}" >&2
  exit 1
fi

preview_active=''
if [[ -f ${preview_state_dir}/active ]]; then
  preview_active=$(<"${preview_state_dir}/active")
fi
if [[ ${preview_active} == "${preview_desired}" ]]; then
  exit 0
fi

printf '%s\n' "${preview_desired}" >"${preview_state_dir}/desired"
printf '%s\n' "${preview_desired}" >"${preview_state_dir}/applying"

git -C "${preview_source_dir}" "${preview_git_args[@]}" fetch --quiet --no-tags "${preview_remote}" \
  "refs/heads/${preview_branch}"
preview_fetched=$(git -C "${preview_source_dir}" rev-parse FETCH_HEAD)
if [[ ${preview_fetched} != "${preview_desired}" ]]; then
  echo "Preview head advanced during fetch; reconciliation will retry." >&2
  exit 75
fi

git -C "${preview_source_dir}" reset --hard "${preview_desired}" >/dev/null

if [[ -x ${preview_state_dir}/after-sync ]]; then
  "${preview_state_dir}/after-sync" "${preview_active}" "${preview_desired}"
fi

printf '%s\n' "${preview_desired}" >"${preview_state_dir}/active"
date -u +%Y-%m-%dT%H:%M:%SZ >"${preview_state_dir}/updated-at"
rm -f "${preview_state_dir}/applying"

printf 'active=%s\n' "${preview_desired}"
