#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  printf '%s\n' 'Missing .env. Copy .env.example to .env and set POSTGRES_PASSWORD first.' >&2
  exit 1
fi

set -a
. ./.env
set +a

: "${POSTGRES_DB:?POSTGRES_DB is required in .env}"
: "${POSTGRES_USER:?POSTGRES_USER is required in .env}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required in .env}"
POSTGRES_PORT=${POSTGRES_PORT:-15432}
export POSTGRES_PORT
export ConnectionStrings__Postgres="Host=127.0.0.1;Port=${POSTGRES_PORT};Database=${POSTGRES_DB};Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}"

docker compose up -d --wait postgres
dotnet tool restore
dotnet tool run dotnet-ef database update \
  --project src/ProductMasterData.Infrastructure/ProductMasterData.Infrastructure.csproj \
  --startup-project src/ProductMasterData.Api/ProductMasterData.Api.csproj

cleanup() {
  trap - INT TERM EXIT
  kill "${API_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
  wait "${API_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

dotnet run --project src/ProductMasterData.Api/ProductMasterData.Api.csproj --launch-profile https &
API_PID=$!
npm --prefix frontend run dev &
WEB_PID=$!

wait "$API_PID" "$WEB_PID"
