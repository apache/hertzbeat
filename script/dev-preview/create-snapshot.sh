#!/usr/bin/env bash

set -euo pipefail

preview_region=${AWS_REGION:-us-east-1}
preview_profile=${AWS_PROFILE:-hertzbeat-agent}
preview_repository=${PREVIEW_REPOSITORY:-hertzbeat-preview}
preview_branch=${PREVIEW_BRANCH:-preview/zhaoqingran/main}
preview_remote="https://git-codecommit.${preview_region}.amazonaws.com/v1/repos/${preview_repository}"
preview_root=$(git rev-parse --show-toplevel)
preview_temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/hertzbeat-preview.XXXXXX")
preview_index="${preview_temp_dir}/index"

cleanup_preview_temp_dir() {
  if [[ -n ${preview_temp_dir:-} && -d ${preview_temp_dir} && ${preview_temp_dir} == *hertzbeat-preview.* ]]; then
    rm -rf -- "${preview_temp_dir}"
  fi
}
trap cleanup_preview_temp_dir EXIT

cd "${preview_root}"

preview_status_before=$(git status --porcelain=v1 -z | git hash-object --stdin)
GIT_INDEX_FILE="${preview_index}" git read-tree HEAD
GIT_INDEX_FILE="${preview_index}" git add -u

while IFS= read -r -d '' preview_untracked_path; do
  GIT_INDEX_FILE="${preview_index}" git add -- "${preview_untracked_path}"
done < <(
  git ls-files --others --exclude-standard -z -- \
    web-app/src \
    script/dev-preview \
    ':(glob)hertzbeat-*/**/src/**'
)

preview_sequence=$(date -u +%Y%m%dT%H%M%SZ)
preview_metadata=$(printf 'preview-sequence=%s\ncanonical-head=%s\n' "${preview_sequence}" "$(git rev-parse HEAD)")
preview_metadata_blob=$(printf '%s' "${preview_metadata}" | git hash-object -w --stdin)
GIT_INDEX_FILE="${preview_index}" git update-index \
  --add \
  --cacheinfo "100644,${preview_metadata_blob},.hertzbeat-preview-revision"
preview_tree=$(GIT_INDEX_FILE="${preview_index}" git write-tree)

preview_aws_args=(--region "${preview_region}")
preview_git_args=(-c credential.helper=)
if [[ -n ${preview_profile} ]]; then
  preview_aws_args+=(--profile "${preview_profile}")
  preview_git_args+=(
    -c "credential.helper=!aws --profile ${preview_profile} codecommit credential-helper \$@"
  )
else
  preview_git_args+=(-c 'credential.helper=!aws codecommit credential-helper $@')
fi
preview_git_args+=(-c credential.UseHttpPath=true)

preview_parent=$(
  aws codecommit get-branch \
    "${preview_aws_args[@]}" \
    --repository-name "${preview_repository}" \
    --branch-name "${preview_branch}" \
    --query branch.commitId \
    --output text 2>/dev/null || true
)

preview_commit_args=("${preview_tree}")
if [[ ${preview_parent} =~ ^[0-9a-f]{40}$ ]]; then
  git "${preview_git_args[@]}" fetch --quiet --no-tags "${preview_remote}" "refs/heads/${preview_branch}"
  preview_parent=$(git rev-parse FETCH_HEAD)
  preview_commit_args+=(-p "${preview_parent}")
fi

preview_commit=$(
  printf 'HertzBeat preview %s\n' "${preview_sequence}" |
    GIT_AUTHOR_NAME='HertzBeat Preview' \
      GIT_AUTHOR_EMAIL='preview@localhost' \
      GIT_COMMITTER_NAME='HertzBeat Preview' \
      GIT_COMMITTER_EMAIL='preview@localhost' \
      git commit-tree "${preview_commit_args[@]}"
)

git "${preview_git_args[@]}" push --quiet "${preview_remote}" \
  "+${preview_commit}:refs/heads/${preview_branch}"

preview_status_after=$(git status --porcelain=v1 -z | git hash-object --stdin)
if [[ ${preview_status_before} != "${preview_status_after}" ]]; then
  echo 'Preview snapshot unexpectedly changed the local worktree or index.' >&2
  exit 1
fi

printf '{"branch":"%s","commit":"%s","tree":"%s","sequence":"%s"}\n' \
  "${preview_branch}" \
  "${preview_commit}" \
  "${preview_tree}" \
  "${preview_sequence}"
