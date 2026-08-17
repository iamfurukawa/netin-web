#!/usr/bin/env bash
set -euo pipefail

deploy_dir="${NETIN_WEB_DIR:-/srv/netin-web}"

if [[ ! -d "$deploy_dir/.git" ]]; then
  echo "Repositorio de deploy ausente em $deploy_dir" >&2
  exit 1
fi

if [[ -n "$(git -C "$deploy_dir" status --porcelain)" ]]; then
  echo "O diretorio de deploy contem alteracoes locais; resolva-as antes do deploy." >&2
  exit 1
fi

git -C "$deploy_dir" pull --ff-only origin main
cd "$deploy_dir"
environment_file="$deploy_dir/.env.production"
if [[ ! -f "$environment_file" ]]; then
  echo "Arquivo de ambiente ausente: $environment_file" >&2
  exit 1
fi
docker compose --env-file "$environment_file" -f docker-compose.production.yml up -d --build --remove-orphans

echo "Deploy da PWA concluido."
