SPEC_GENERATOR_VER=1.3.2

.PHONY: install

all: website

clean:
	rm -rf ./out

install:
	@INSTALLED_VERSION=$$(spec-generator --version); \
	if [ "$$INSTALLED_VERSION" != "$(SPEC_GENERATOR_VER)" ]; then \
		echo "Installed version ($$INSTALLED_VERSION) is different from the desired version ($(SPEC_GENERATOR_VER))."; \
		echo "Installing spec-generator@v$(SPEC_GENERATOR_VER)"; \
		npm install -g spec-generator@v$(SPEC_GENERATOR_VER); \
	else \
		echo "spec-generator is already installed at the desired version ($(SPEC_GENERATOR_VER))."; \
	fi

website: clean install
	spec-generator -c .config.json

watch: clean install
	spec-generator -c .config.json -w

superlinter:
	docker run --rm -e VALIDATE_ALL_CODEBASE=false -e RUN_LOCAL=true -e VALIDATE_MARKDOWN=true -e MARKDOWN_CONFIG_FILE=".markdownlint.json" -e LINTER_RULES_PATH="." -v $(shell pwd):/tmp/lint github/super-linter:v4
