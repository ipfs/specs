all: superlinter

superlinter:
	docker run --rm -e VALIDATE_ALL_CODEBASE=false -e RUN_LOCAL=true -e VALIDATE_MARKDOWN=true -e MARKDOWN_CONFIG_FILE=".markdownlint.json" -e LINTER_RULES_PATH="." -v $(shell pwd):/tmp/lint github/super-linter:v4
