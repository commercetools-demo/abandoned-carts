#!/usr/bin/env bash
#
# The gate. Everything fast and self-contained that a deployment could
# break, run locally, because nothing runs this in CI.
#
#   ./scripts/predeploy.sh            all five applications
#   ./scripts/predeploy.sh mc-app     one of them
#
# Not in here: anything needing a running server, real credentials, or
# minutes rather than seconds. Those get their own deliberate command.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

if [ "$#" -gt 0 ]; then APPS=("$@"); else
  APPS=(service job order-created-event mail-sender mc-app)
fi

failed=()

banner() { printf '\n\033[1m── %s ──\033[0m\n' "$1"; }

run() {
  local app=$1 label=$2
  shift 2
  if "$@"; then
    printf '  \033[32m✓\033[0m %s\n' "$label"
  else
    printf '  \033[31m✗\033[0m %s\n' "$label"
    failed+=("$app: $label")
  fi
}

# npm ci rather than npm install: a lockfile that no longer matches
# package.json builds fine locally and fails in Connect, which is the one
# failure this gate exists to catch before a deploy rather than after.
install_npm() {
  local dir=$1
  if [ -d "$dir/node_modules" ]; then return 0; fi
  ( cd "$dir" && npm ci --silent )
}

for app in "${APPS[@]}"; do
  banner "$app"
  case "$app" in
    service|job|order-created-event)
      install_npm "$ROOT/$app"
      run "$app" typecheck sh -c "cd '$ROOT/$app' && npx tsc --noEmit"
      run "$app" lint      sh -c "cd '$ROOT/$app' && npm run --silent lint"
      run "$app" build     sh -c "cd '$ROOT/$app' && npm run --silent build"
      if [ "$app" != "job" ] || [ -d "$ROOT/$app/src/tests" ]; then
        run "$app" tests   sh -c "cd '$ROOT/$app' && npm test --silent -- --passWithNoTests"
      fi
      ;;
    mail-sender)
      install_npm "$ROOT/$app"
      run "$app" lint  sh -c "cd '$ROOT/$app' && npm run --silent lint"
      run "$app" tests sh -c "cd '$ROOT/$app' && npm run --silent test:unit"
      ;;
    mc-app)
      # yarn, not npm: package.json carries a `resolutions` block that only
      # yarn honours, and npm cannot resolve this dependency tree at all.
      if [ ! -d "$ROOT/mc-app/node_modules" ]; then
        ( cd "$ROOT/mc-app" && NPM_TOKEN="" yarn install --silent --frozen-lockfile )
      fi
      run mc-app lint  sh -c "cd '$ROOT/mc-app' && NPM_TOKEN='' npx jest --config jest.eslint.config.js --silent"
      run mc-app tests sh -c "cd '$ROOT/mc-app' && NPM_TOKEN='' npx jest --config jest.test.config.js --silent"
      run mc-app build sh -c "cd '$ROOT/mc-app' && NPM_TOKEN='' npx mc-scripts build >/dev/null"
      ;;
    *)
      echo "Unknown application: $app" >&2
      exit 2
      ;;
  esac
done

echo
if [ ${#failed[@]} -eq 0 ]; then
  printf '\033[32mPredeploy green.\033[0m\n'
else
  printf '\033[31mPredeploy failed:\033[0m\n'
  printf '  %s\n' "${failed[@]}"
  exit 1
fi
