
#!/usr/bin/env bash
# ============================================================
#  SMECO 2.0 — Automatic Setup & Launch
#
#  Usage:
#  chmod +x start.sh
#  ./start.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

log()    { printf "%b[SMECO]%b %s\n" "$CYAN" "$RESET" "$1"; }
ok()     { printf "%b[OK]%b     %s\n" "$GREEN" "$RESET" "$1"; }
warn()   { printf "%b[WARN]%b   %s\n" "$YELLOW" "$RESET" "$1"; }
error()  { printf "%b[ERROR]%b  %s\n" "$RED" "$RESET" "$1"; exit 1; }
header() { printf "\n%b%s%b\n" "$BOLD" "$1" "$RESET"; printf "────────────────────────────────────\n"; }

FRONTEND_PORT=5173
BACKEND_PORT=3001
FRONTEND_URL="http://localhost:$FRONTEND_PORT"
BACKEND_URL="http://localhost:$BACKEND_PORT"
BACKEND_HEALTH_URL="$BACKEND_URL/health"

clear

printf "%b" "$CYAN$BOLD"
printf "███████╗███╗   ███╗███████╗ ██████╗ ██████╗ \n"
printf "██╔════╝████╗ ████║██╔════╝██╔════╝██╔═══██╗\n"
printf "███████╗██╔████╔██║█████╗  ██║     ██║   ██║\n"
printf "╚════██║██║╚██╔╝██║██╔══╝  ██║     ██║   ██║\n"
printf "███████║██║ ╚═╝ ██║███████╗╚██████╗╚██████╔╝\n"
printf "╚══════╝╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═════╝ \n"
printf "%b\n" "$RESET"

printf "%bSMECO 2.0 — 3D Ship Engine Platform%b\n" "$BOLD" "$RESET"
printf "%bAutomatic setup, backend launch and frontend start%b\n\n" "$BLUE" "$RESET"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

while [ ! -f "$PROJECT_ROOT/package.json" ] && [ "$PROJECT_ROOT" != "/" ]; do
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

[ ! -f "$PROJECT_ROOT/package.json" ] && error "package.json was not found. Run this script from the project root directory."

cd "$PROJECT_ROOT"
log "Working directory: $PROJECT_ROOT"

is_port_in_use() {
  local PORT=$1

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ano 2>/dev/null | grep ":$PORT" | grep -q "LISTENING"
    return $?
  else
    return 1
  fi
}

kill_port() {
  local PORT=$1
  local PID=""

  if ! is_port_in_use "$PORT"; then
    return 0
  fi

  warn "Port $PORT is already in use"
  log "Stopping existing process on port $PORT..."

  if command -v lsof >/dev/null 2>&1; then
    PID=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)

    if [ -n "$PID" ]; then
      kill -9 $PID 2>/dev/null || true
    fi

  elif command -v netstat >/dev/null 2>&1 && command -v taskkill.exe >/dev/null 2>&1; then
    PID=$(netstat -ano | grep ":$PORT" | grep "LISTENING" | awk '{print $5}' | head -n 1)

    if [ -n "$PID" ]; then
      taskkill.exe //PID "$PID" //F >/dev/null 2>&1 || true
    fi

  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "$PORT/tcp" >/dev/null 2>&1 || true
  fi

  sleep 1

  if is_port_in_use "$PORT"; then
    error "Could not release port $PORT"
  else
    ok "Port $PORT released"
  fi
}

wait_for_backend() {
  local URL=$1
  local MAX_ATTEMPTS=15
  local ATTEMPT=1

  while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
    if command -v curl >/dev/null 2>&1; then
      if curl -s "$URL" >/dev/null 2>&1; then
        return 0
      fi
    else
      if kill -0 "$BACKEND_PID" 2>/dev/null; then
        return 0
      fi
    fi

    sleep 1
    ATTEMPT=$((ATTEMPT + 1))
  done

  return 1
}

header "1. Checking Node.js"

if ! command -v node >/dev/null 2>&1; then
  error "Node.js is not installed. Install Node.js 18+ from https://nodejs.org"
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
  warn "Node.js version 18+ is recommended. Your version: $(node -v)"
else
  ok "Node.js $(node -v)"
fi

if ! command -v npm >/dev/null 2>&1; then
  error "npm was not found. Reinstall Node.js."
fi

ok "npm $(npm -v)"

header "2. Checking Ports"

kill_port "$FRONTEND_PORT"
kill_port "$BACKEND_PORT"

if is_port_in_use "$FRONTEND_PORT"; then
  error "Could not free frontend port $FRONTEND_PORT"
else
  ok "Frontend port $FRONTEND_PORT is available"
fi

if is_port_in_use "$BACKEND_PORT"; then
  error "Could not free backend port $BACKEND_PORT"
else
  ok "Backend port $BACKEND_PORT is available"
fi

header "3. Frontend — Package Installation"

if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
  ok "Frontend node_modules already exists — skipping installation"
else
  log "Installing frontend packages..."
  npm install || error "Frontend npm install failed"
  ok "Frontend packages installed"
fi

header "4. Backend — Package Installation"

BACKEND_DIR="$PROJECT_ROOT/backend"
BACKEND_PID=""
FRONTEND_PID=""

if [ ! -d "$BACKEND_DIR" ]; then
  warn "backend/ directory was not found — skipping backend"
else
  cd "$BACKEND_DIR"

  if [ ! -f "package.json" ]; then
    error "backend/package.json was not found."
  fi

  if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    ok "Backend node_modules already exists — skipping installation"
  else
    log "Installing backend packages..."
    npm install || error "Backend npm install failed"
    ok "Backend packages installed"
  fi

  mkdir -p data
  mkdir -p "$PROJECT_ROOT/public/docs/components"
  ok "Backend data and docs directories prepared"

  cd "$PROJECT_ROOT"
fi

header "5. Environment Configuration"

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  ok ".env created from .env.example"
elif [ -f ".env" ]; then
  ok ".env exists"
else
  ok ".env is not required"
fi

header "6. Starting Servers"

cleanup() {
  printf "\n"
  log "Shutting down servers..."

  if command -v taskkill.exe >/dev/null 2>&1; then
    [ -n "$BACKEND_PID" ] && taskkill.exe //F //T //PID "$BACKEND_PID" >/dev/null 2>&1
    [ -n "$FRONTEND_PID" ] && taskkill.exe //F //T //PID "$FRONTEND_PID" >/dev/null 2>&1
  else
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  fi

  kill_port "$FRONTEND_PORT"
  kill_port "$BACKEND_PORT"

  ok "Servers stopped"
  exit 0
}

trap cleanup SIGINT SIGTERM

if [ -d "$BACKEND_DIR" ]; then
  log "Starting backend at $BACKEND_URL ..."

  cd "$BACKEND_DIR"

  node server.js &
  BACKEND_PID=$!

  cd "$PROJECT_ROOT"

  if wait_for_backend "$BACKEND_HEALTH_URL"; then
    ok "Backend started"
  elif kill -0 "$BACKEND_PID" 2>/dev/null; then
    warn "Backend is running, but health check did not respond at $BACKEND_HEALTH_URL"
  else
    error "Backend failed to start. Check backend/server.js"
  fi
fi

log "Starting frontend at $FRONTEND_URL ..."

npm run dev &
FRONTEND_PID=$!

sleep 2

if kill -0 "$FRONTEND_PID" 2>/dev/null; then
  ok "Frontend started"

  log "Opening browser..."

  if command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c start "" "$FRONTEND_URL" >/dev/null 2>&1 &

  elif command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Start-Process '$FRONTEND_URL'" >/dev/null 2>&1 &

  elif command -v open >/dev/null 2>&1; then
    open "$FRONTEND_URL" >/dev/null 2>&1 &

  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$FRONTEND_URL" >/dev/null 2>&1 &

  else
    warn "Could not open the browser automatically."
  fi

else
  error "Frontend failed to start. Check package.json and Vite configuration."
fi

printf "\n"
printf "%b╔══════════════════════════════════════╗%b\n" "$GREEN$BOLD" "$RESET"
printf "%b║       SMECO 2.0 — READY             ║%b\n" "$GREEN$BOLD" "$RESET"
printf "%b╠══════════════════════════════════════╣%b\n" "$GREEN$BOLD" "$RESET"
printf "%b║  Frontend: http://localhost:5173     ║%b\n" "$GREEN$BOLD" "$RESET"

if [ -d "$BACKEND_DIR" ]; then
  printf "%b║  Backend:  http://localhost:3001     ║%b\n" "$GREEN$BOLD" "$RESET"
fi

printf "%b╠══════════════════════════════════════╣%b\n" "$GREEN$BOLD" "$RESET"
printf "%b║  Stop servers: Ctrl + C             ║%b\n" "$GREEN$BOLD" "$RESET"
printf "%b╚══════════════════════════════════════╝%b\n" "$GREEN$BOLD" "$RESET"
printf "\n"

wait