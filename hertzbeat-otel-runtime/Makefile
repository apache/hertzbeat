# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements. See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0.

OCB_VERSION ?= v0.156.0
RUNTIME_BINARY := _build/otelcol-hertzbeat/hertzbeat-otel-runtime
TEST_CONFIG := config/collector-config.test.yaml

.PHONY: build clean validate

build:
	mkdir -p _build
	go run go.opentelemetry.io/collector/cmd/builder@$(OCB_VERSION) --config builder-config.yaml

validate: build
	HERTZBEAT_COLLECTOR_ID=phase0-test \
	HERTZBEAT_WORKSPACE_ID=default \
	HERTZBEAT_OTLP_HTTP_ENDPOINT=http://127.0.0.1:1157/api/otlp \
	HERTZBEAT_OTLP_TOKEN=phase0-test-token \
	HERTZBEAT_OTEL_HEALTH_PORT=13133 \
	$(RUNTIME_BINARY) validate --config $(TEST_CONFIG)

clean:
	rm -rf _build
