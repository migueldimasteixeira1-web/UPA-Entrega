.PHONY: up down logs reset dev-up dev-down vm certs

certs:
	./deploy/generate-self-signed-cert.sh $(or $(DOMAIN),localhost)

up: certs
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

reset:
	docker compose down -v
	docker compose up --build

dev-up:
	docker compose -f compose.dev.yaml up --build

dev-down:
	docker compose -f compose.dev.yaml down

vm:
	./scripts/iniciar-vm.sh
