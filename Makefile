# STF API — desenvolvimento local
# make          → instala dependências
# make setup    → install + .env + Postgres (Docker)
# make start    → .env + Postgres + API NestJS (watch)

SHELL := /bin/bash
COMPOSE := docker compose

.DEFAULT_GOAL := install

.PHONY: help install setup env secrets mail-check db-up db-down db-logs db-reset start stop lint test migrate generate prisma-studio

help:
	@echo "STF API — alvos Make"
	@echo ""
	@echo "  make                 Instala dependências"
	@echo "  make setup           install + .env + Postgres (Docker)"
	@echo "  make secrets         Gera JWT_ACCESS_SECRET aleatório (copie para .env)"
	@echo "  make mail-check      Verifica configuração de e-mail no .env"
	@echo "  make start           Postgres + API NestJS (:3000, watch)"
	@echo "  make db-up           Sobe PostgreSQL via Docker Compose"
	@echo "  make db-down         Para containers Docker"
	@echo "  make db-logs         Logs do Postgres"
	@echo "  make migrate         prisma migrate dev"
	@echo "  make generate        prisma generate"
	@echo "  make prisma-studio   Prisma Studio"
	@echo "  make lint            ESLint"
	@echo "  make test            Testes unitários + e2e"
	@echo "  make stop            Para containers Docker"

install:
	@echo ">> Instalando dependências..."
	@npm install

setup: install env db-up
	@echo ">> Setup concluído. Próximo passo: make migrate && make start"

secrets:
	@echo "JWT_ACCESS_SECRET=$$(openssl rand -base64 48 | tr -d '\n')"
	@echo "# Cole a linha acima em .env (substitua o valor de dev)"

mail-check:
	@if [ ! -f .env ]; then \
		echo ">> Crie .env com: make setup"; \
		exit 1; \
	fi
	@. ./.env 2>/dev/null; \
	provider=$${MAIL_PROVIDER:-gmail}; \
	if [ "$$provider" = "console" ]; then \
		echo ">> MAIL_PROVIDER=console — e-mails não saem; códigos no terminal da API."; \
	elif [ "$$provider" = "gmail" ]; then \
		if [ -z "$${GMAIL_USER:-}" ] || [ -z "$${GMAIL_APP_PASSWORD:-}" ] || [ "$${GMAIL_APP_PASSWORD}" = "cole_sua_senha_de_app_aqui" ]; then \
			echo ">> Configure GMAIL_USER e GMAIL_APP_PASSWORD em .env"; \
			echo ">> Senha de app: https://myaccount.google.com/apppasswords"; \
			exit 1; \
		else \
			echo ">> Gmail SMTP OK — remetente: $${MAIL_FROM:-$$GMAIL_USER}"; \
		fi; \
	elif [ -z "$${RESEND_API_KEY:-}" ] || [ "$${RESEND_API_KEY}" = "re_cole_sua_chave_aqui" ]; then \
		echo ">> Configure RESEND_API_KEY em .env (https://resend.com/api-keys)"; \
		exit 1; \
	else \
		echo ">> Resend OK — remetente: $${MAIL_FROM:-onboarding@resend.dev}"; \
	fi

env:
	@if [ -f .env.example ] && [ ! -f .env ]; then \
		cp .env.example .env; \
		echo ">> Criado .env"; \
	fi

db-up:
	@if command -v docker >/dev/null 2>&1; then \
		echo ">> Subindo PostgreSQL (Docker)..."; \
		$(COMPOSE) up -d --wait postgres 2>/dev/null || $(COMPOSE) up -d postgres; \
	else \
		echo ">> Docker não encontrado — use Postgres local ou instale Docker."; \
	fi

db-down:
	@if command -v docker >/dev/null 2>&1; then \
		$(COMPOSE) down; \
	else \
		echo ">> Docker não encontrado."; \
	fi

db-logs:
	@$(COMPOSE) logs -f postgres

db-reset:
	@$(COMPOSE) down -v
	@$(COMPOSE) up -d --wait postgres 2>/dev/null || $(COMPOSE) up -d postgres

start: env db-up
	@if curl -sf -o /dev/null http://localhost:3000/health; then \
		echo ">> API já está rodando em http://localhost:3000."; \
	else \
		npm run start:dev; \
	fi

stop: db-down
	@echo ">> Containers Docker parados. API: use Ctrl+C no terminal do make start."

lint:
	@npm run lint

test:
	@npm run test
	@npm run test:e2e:prepare && npm run test:e2e

migrate:
	@npx prisma migrate dev

generate:
	@npx prisma generate

prisma-studio:
	@npx prisma studio
