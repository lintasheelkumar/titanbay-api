dev:
	docker-compose up

build:
	docker-compose build

test:
	npm test

seed:
	npx prisma db seed

migrate:
	npx prisma migrate dev

lint:
	npx eslint src/ --ext .ts

format:
	npx prettier --write "src/**/*.ts"

clean:
	docker-compose down -v
