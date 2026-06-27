.PHONY: up down restart logs dev dev-stop db-reset db-shell server-shell status clean help

# === Production (Docker) ===

up: ## Build and start all services
	docker compose up -d --build

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## View logs (all services)
	docker compose logs -f

logs-server: ## View server logs
	docker compose logs -f server

logs-client: ## View client logs
	docker compose logs -f client

# === Development (local) ===

dev: ## Start dev mode (DB in Docker, server+client local)
	docker compose up -d postgres redis
	@echo "Waiting for DB..."
	@sleep 3
	cd server && npm run dev &
	cd client && npx vite --host &
	@echo ""
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:4000"
	@echo "  Admin:    http://localhost:5173/admin/login"
	@echo ""

dev-stop: ## Stop dev mode
	-pkill -f "node.*app.js" 2>/dev/null
	-pkill -f "vite" 2>/dev/null
	docker compose stop postgres redis

install: ## Install all dependencies
	cd server && npm install
	cd client && npm install

# === Database ===

db-reset: ## Reset database (WARNING: destroys data)
	docker compose down -v
	docker compose up -d postgres redis
	@echo "DB reset. Run 'make dev' or 'make up' to restart."

db-shell: ## Open psql shell
	docker exec -it ex-shop-db psql -U ex_shop_user -d ex_shop

# === Utilities ===

server-shell: ## Shell into server container
	docker exec -it ex-shop-server sh

status: ## Show running containers
	docker compose ps

clean: ## Remove all containers, volumes, images
	docker compose down -v --rmi local

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
