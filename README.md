# Netin Web

PWA mobile-first da Fase 2 do Netin.

## Estado atual

- Publicada em `https://netin.13997906387.xyz`.
- Faz uma verificação real de `GET /health` na API e apresenta o estado da conexão.
- A interface de cadastro/login, dispositivos, pareamento e status depende dos endpoints de autenticação e domínio que ainda serão implementados no `netin-server`.

## Desenvolvimento local

1. Execute `npm install`.
2. Execute `npm run dev`.
3. Acesse `http://localhost:5173`.

Por padrão, o desenvolvimento usa a API em `http://localhost:3000`. Para apontar
a PWA a outro ambiente, defina `VITE_API_BASE_URL` antes de executar `npm run dev`
ou `npm run build`.

## Deploy na Raspberry Pi

Clone o repositório em `/srv/netin-web`. O compose de produção cria um container
Nginx na rede Docker externa `nginxnet`; o Nginx central o expõe em
`netin.13997906387.xyz`. O build aponta para a API em
`https://netin-server.13997906387.xyz`.

Pushes na `main` executam o build no GitHub Actions e, após sucesso, chamam `scripts/deploy-production.sh` no runner ARM64 da Raspberry. Não há arquivo de ambiente local necessário para esse deploy: a URL pública da API é definida no `docker-compose.production.yml` como argumento de build.
