.PHONY: install

all: website

clean:
	rm -rf ./out

install:
	@if [ ! -d "node_modules" ] || ! git diff --quiet package-lock.json; then \
		npm ci --prefer-offline --no-audit --no-fund --progress=false; \
	fi

website: clean install
	npx spec-generator -c .config.json

watch: clean install
	npx spec-generator -c .config.json -w

superlinter:
	docker run --rm -e VALIDATE_ALL_CODEBASE=false -e RUN_LOCAL=true -e VALIDATE_MARKDOWN=true -e MARKDOWN_CONFIG_FILE=".markdownlint.json" -e LINTER_RULES_PATH="." -e DEFAULT_BRANCH='main' -v $(shell pwd):/tmp/lint ghcr.io/super-linter/super-linter:slim-v7
