local-up:
	docker-compose -f docker/local/docker-compose.yml up -d --build

local-down:
	docker-compose -f docker/local/docker-compose.yml down

local-pg-up:
	docker-compose -f docker/local/pg.yml up -d

local-pg-down:
	docker-compose -f docker/local/pg.yml down
