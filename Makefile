SPEC_GENERATOR_VER=v1.1.2

all: website

clean:
	rm -rf ./out

install:
	npm install -g spec-generator@$(SPEC_GENERATOR_VER)

website: clean install
	spec-generator -c .config.json

watch: clean install
	spec-generator -c .config.json -w

superlinter:
	docker run --rm -e VALIDATE_ALL_CODEBASE=false -e RUN_LOCAL=true -e VALIDATE_MARKDOWN=true -e MARKDOWN_CONFIG_FILE=".markdownlint.json" -e LINTER_RULES_PATH="." -v $(shell pwd):/tmp/lint github/super-linter:v4
