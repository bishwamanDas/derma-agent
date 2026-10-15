#!/usr/bin/env bash
# Starts the Python inference API and the Next.js frontend together.
set -e
cd "$(dirname "$0")"

VENV="backend/.venv"
if [ ! -d "$VENV" ]; then
  echo "Creating Python venv..."
  python3 -m venv "$VENV"
  # build on disk to prevent /tmp exhaustion
  TMPDIR="$PWD/.piptmp" "$VENV/bin/pip" install --no-cache-dir -r backend/requirements.txt
fi

echo "Starting inference API on :8000 ..."
(cd backend && ../"$VENV"/bin/uvicorn app:app --host 0.0.0.0 --port 8000) &
API_PID=$!

echo "Starting Next.js on :3000 ..."
npm run dev &
WEB_PID=$!

trap 'kill $API_PID $WEB_PID 2>/dev/null' EXIT
wait
