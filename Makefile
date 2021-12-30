local-up:
	if ! [ -f .env.docker.local ]; then echo "no such file: .env.docker.local"; else cp .env.docker.local ./docker/local/.env ; fi
	docker-compose -f docker/local/docker-compose.yml up -d --build

local-down:
	docker-compose -f docker/local/docker-compose.yml down

local-pg-up:
	docker-compose -f docker/local/pg.yml up -d

local-pg-down:
	docker-compose -f docker/local/pg.yml down

build-image:
	docker build -t omniedge-backend -f docker/Dockerfile .
