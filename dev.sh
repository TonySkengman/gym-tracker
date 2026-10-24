#!/usr/bin/env bash
# Start Form locally. Bash job control gives each app its own process group.
set -euo pipefail
cd "$(dirname "$0")"

for command in docker node npm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing $command. Install the prerequisites listed in README.md, then retry." >&2
    exit 1
  fi
done

if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)'; then
  echo "Form needs Node.js 22.12 or newer (Node.js 24 recommended)." >&2
  exit 1
fi

if [[ "$(uname -s)" == Darwin ]]; then
  if ! form_java_home=$(/usr/libexec/java_home -v 21 2>/dev/null); then
    echo "Java 21 is missing. Install a Java 21 JDK, then retry." >&2
    exit 1
  fi
  export JAVA_HOME="$form_java_home"
fi

java_command=java
if [[ -n "${JAVA_HOME:-}" ]]; then
  java_command="$JAVA_HOME/bin/java"
fi
if ! java_version=$("$java_command" -version 2>&1) || ! [[ "$java_version" =~ version\ \"21[\.\"] ]]; then
  echo "Select a Java 21 JDK using JAVA_HOME, then retry." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not available. Open Docker Desktop and wait for its engine to start." >&2
  exit 1
fi

if command -v lsof >/dev/null 2>&1; then
  for port in 8080 5173; do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Port $port is already in use. Stop the existing app in its terminal, then retry." >&2
      exit 1
    fi
  done
fi

echo "Starting PostgreSQL and waiting until it is healthy…"
docker compose up -d --wait

# Install on first use and after the lockfile changes, not on every launch.
dependency_stamp=frontend/.cache/dev-package-lock.json
if [[ ! -d frontend/node_modules ]] || ! cmp -s frontend/package-lock.json "$dependency_stamp"; then
  echo "Installing frontend dependencies…"
  (cd frontend && npm ci --cache .cache/npm)
  mkdir -p frontend/.cache
  cp frontend/package-lock.json "$dependency_stamp"
fi

backend_pid=
frontend_pid=
cleanup() {
  trap '' INT TERM
  echo "Stopping frontend and backend. PostgreSQL stays running."
  for pid in "$backend_pid" "$frontend_pid"; do
    [[ -z "$pid" ]] || kill -TERM -- "-$pid" 2>/dev/null || true
  done
  # Give the apps up to five seconds to shut down before removing remaining children.
  for attempt in 1 2 3 4 5; do
    running=false
    for pid in "$backend_pid" "$frontend_pid"; do
      if [[ -n "$pid" ]] && kill -0 -- "-$pid" 2>/dev/null; then running=true; fi
    done
    if [[ "$running" == false ]]; then break; fi
    sleep 1
  done
  for pid in "$backend_pid" "$frontend_pid"; do
    [[ -z "$pid" ]] || kill -KILL -- "-$pid" 2>/dev/null || true
    [[ -z "$pid" ]] || wait "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
set -m

echo "Starting Form. Open http://localhost:5173 when Vite is ready."
echo "Frontend and backend logs appear below. Press Ctrl+C to stop both."
(cd backend && exec ./mvnw spring-boot:run) </dev/null &
backend_pid=$!
(cd frontend && exec npm run dev) </dev/null &
frontend_pid=$!

# macOS's built-in Bash does not support wait -n.
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done
echo "An app process exited; stopping the other app." >&2
exit 1
