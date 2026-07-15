# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements. See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0.

OCB_VERSION ?= v0.156.0
RUNTIME_BINARY := _build/otelcol-hertzbeat/hertzbeat-otel-runtime
RUNTIME_SOURCE := _build/otelcol-hertzbeat
TEST_CONFIG := config/collector-config.test.yaml
PLATFORMS := macos-arm64 macos-amd64 linux-arm64 linux-amd64 windows-amd64

.PHONY: build build-platforms clean validate

build:
	mkdir -p _build
	go run go.opentelemetry.io/collector/cmd/builder@$(OCB_VERSION) --config builder-config.yaml

build-platforms: build
	mkdir -p $(addprefix dist/,$(PLATFORMS))
	cd $(RUNTIME_SOURCE) && CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -trimpath \
		-o ../../dist/macos-arm64/hertzbeat-otel-runtime .
	cd $(RUNTIME_SOURCE) && CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -trimpath \
		-o ../../dist/macos-amd64/hertzbeat-otel-runtime .
	cd $(RUNTIME_SOURCE) && CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath \
		-o ../../dist/linux-arm64/hertzbeat-otel-runtime .
	cd $(RUNTIME_SOURCE) && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath \
		-o ../../dist/linux-amd64/hertzbeat-otel-runtime .
	cd $(RUNTIME_SOURCE) && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath \
		-o ../../dist/windows-amd64/hertzbeat-otel-runtime.exe .
	for platform in $(PLATFORMS); do cp runtime-manifest.json dist/$$platform/; done

validate: build
	mkdir -p _build/validation-storage
	touch _build/validation.log
	HERTZBEAT_COLLECTOR_ID=phase0-test \
	HERTZBEAT_WORKSPACE_ID=default \
	HERTZBEAT_OTLP_HTTP_ENDPOINT=http://127.0.0.1:1157/api/otlp \
	HERTZBEAT_OTLP_TOKEN=phase0-test-token \
	HERTZBEAT_OTEL_HEALTH_PORT=13133 \
	HERTZBEAT_OTEL_TEST_LOG=$$(pwd)/_build/validation.log \
	HERTZBEAT_OTEL_FILE_STORAGE_DIR=$$(pwd)/_build/validation-storage \
	$(RUNTIME_BINARY) validate --config $(TEST_CONFIG)

clean:
	rm -rf _build dist
