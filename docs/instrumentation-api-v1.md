# Application Instrumentation API v1

This document freezes the backend contract consumed by the React onboarding flow. All endpoints use
the ordinary HertzBeat `Message<T>` envelope; the examples below show the `data` value only.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/instrumentation/v1/catalog` | Languages, frameworks, methods, component disclosure, and signal maturity |
| `POST` | `/api/instrumentation/v1/render` | Structured install, configure, start, container, and disable steps |
| `POST` | `/api/instrumentation/v1/detect` | Context-scoped Metrics, Logs, and Traces reception state |

No endpoint accepts a token in a URL. The render request has no token field. The server returns a
structured `authorizationToken` placeholder whose marker is `${HERTZBEAT_TOKEN}`, whose
`valueFormat` is `url_unreserved`, and whose `replacement` is `raw`. A Managed OTLP token must match
the non-empty URL-unreserved ASCII pattern `[A-Za-z0-9._~-]+`; compact JWT characters are safe. The
server has already rendered surrounding `%20` and shell quoting. React validates the transient token
and replaces the marker verbatim only when the operator copies a snippet. It must not replace the
marker in displayed content. Tokens, installation output, and telemetry bodies are not part of this
contract.

## Compatibility rules

- The path version and numeric `schemaVersion` must both be `1`.
- A breaking field, enum, validation, or semantic change requires `/v2` and `schemaVersion: 2`.
- New catalog entries and new optional response fields are additive. Consumers must ignore unknown
  fields and treat unknown enum values as unavailable until upgraded.
- A concrete component uses `versionPolicy: "pinned"` and an exact upstream version. The generic SDK
  fallback uses `versionPolicy: "language_specific"`; its eventual language adapter must pin a real
  official package before rendering executable installation commands.
- Versions are pinned and reviewed compatibility inputs, not a claim that they are the newest
  upstream releases. `dependencies` discloses every additional fixed SDK, exporter, or framework
  package used by a guide; these entries are manifest metadata and never HertzBeat dependencies.
- Signal maturity is method-specific rather than a language-wide SDK claim. It follows the selected
  official automatic-instrumentation or SDK path: Java and .NET expose all three signals, Node.js
  excludes application Logs, Python Logs remain preview, PHP automatic instrumentation exposes
  Traces only, and Go eBPF remains preview/WIP while the official Go SDK is the default.
- `artifacts` carries immutable verification metadata for downloads outside package managers. The
  Java 2.27.0 guide verifies the upstream GitHub release asset against the published SHA-256 digest
  before launch.
- `bundledWithHertzBeat` is always `false` for language Agents, automatic instrumentation packages,
  and SDKs. The core release must not contain those binaries.
- `environment` is the application deployment form (`vm`, `docker`, `kubernetes`, or
  `windows_service`). `service.environment` is the OpenTelemetry
  `deployment.environment.name` resource value.
- `CollectorTarget` comes only from registered Collector information returned by `/api/collector`,
  or from an explicit operator endpoint entered for this form and retained only in memory. React must
  not default to an IP with ports 4318/4317, derive endpoints from the browser URL, or persist an
  operator endpoint.
- Detection never uses global counts. The storage adapter must apply `service.name`,
  `service.namespace`, `deployment.environment.name`, Collector ID, and `startedAt` together.
- Detection status is exactly `waiting`, `received`, `unsupported`, `unavailable`, or `error`.
  `unsupported` comes from the catalog; missing or failed storage never becomes `waiting` or
  `received`.
- The initial v1 schema ships an explicit unavailable detection-store fallback. That fallback freezes
  the wire contract but is not production evidence of signal reception. M5 must replace it with the
  real Greptime adapter before onboarding can report `received`.
- Fresh Collector heartbeat state refines only supported signals that are still `waiting`.
  A missing/non-running Collector becomes `unavailable/collector_unavailable`, and a missing or
  rejected intake credential becomes `error/authentication_failed`. Already `received`, catalog
  `unsupported`, and storage `unavailable`/`error` results remain authoritative and are never hidden
  by Collector readiness. If the optional heartbeat adapter itself is unavailable, detection keeps
  the storage result instead of inventing Collector health.
- Every timestamp (`startedAt`, `detectedAt`, `lastReceivedAt`, and `deadlineAt`) is Unix epoch time in
  milliseconds. Durations (`pollAfterMs`) are milliseconds.
- Automatic detection polls every 3,000 ms for at most 120,000 ms from `startedAt`. `received` and
  `unsupported` are terminal for one signal. Any `unavailable` or `error`, or a `waiting` signal at
  the deadline, yields `manual_retry`. A pre-deadline mix containing `waiting` yields
  `continue_polling`. All three signals terminal as `received`/`unsupported` yields `complete`.
- Query handoffs are typed only by `signal`; there is no free-form target. `enabled` is true only for
  a `received` signal.
- `SignalDetection` invariants are fixed: `received` requires a positive timestamp and no error;
  `waiting` requires no timestamp and `signal_not_received`; `unsupported` requires no timestamp and
  `signal_not_supported`; `unavailable` requires no timestamp and an error; `error` requires an error.
- Invalid schema, selection, and context use the ordinary `Message<T>` envelope with
  `PARAM_INVALID_CODE` (`1`) and
  stable `msg` values `instrumentation_schema_unsupported`, `instrumentation_selection_invalid`, or
  `instrumentation_context_invalid`. Consumers refresh the catalog after a schema or selection error.
- Frontend enum localization is deterministic. When the response supplies `labelKey`, `titleKey`,
  `executionLocationKey`, or `purposeKey`, that key wins. Otherwise derive
  `instrumentation.enum.<enum_family>.<wire_value>` using the lowercase JSON enum family and value;
  never use a localized display string as state or a request value.

## Complete catalog example

```json
{
  "schemaVersion": 1,
  "languages": [
    {
      "language": "java",
      "labelKey": "instrumentation.language.java",
      "frameworks": [
        {
          "framework": "spring_boot",
          "labelKey": "instrumentation.framework.spring_boot",
          "methods": [
            {
              "method": "zero_code",
              "labelKey": "instrumentation.method.zero_code",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes", "windows_service"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64", "windows_amd64"],
              "signals": {"metrics": "supported", "logs": "supported", "traces": "supported"},
              "component": {
                "name": "OpenTelemetry Java Agent",
                "sourceUrl": "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/tag/v2.27.0",
                "version": "2.27.0",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [],
                "artifacts": [
                  {
                    "name": "opentelemetry-javaagent.jar",
                    "downloadUrl": "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.27.0/opentelemetry-javaagent.jar",
                    "algorithm": "sha256",
                    "digest": "bd01fea1304e8c8803fff827a0bdda02b2266742a85c62548053c6761474bb5b",
                    "provenanceUrl": "https://api.github.com/repos/open-telemetry/opentelemetry-java-instrumentation/releases/tags/v2.27.0"
                  }
                ]
              }
            }
          ]
        },
        {
          "framework": "java_jar",
          "labelKey": "instrumentation.framework.java_jar",
          "methods": [
            {
              "method": "zero_code",
              "labelKey": "instrumentation.method.zero_code",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes", "windows_service"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64", "windows_amd64"],
              "signals": {"metrics": "supported", "logs": "supported", "traces": "supported"},
              "component": {
                "name": "OpenTelemetry Java Agent",
                "sourceUrl": "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/tag/v2.27.0",
                "version": "2.27.0",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [],
                "artifacts": [
                  {
                    "name": "opentelemetry-javaagent.jar",
                    "downloadUrl": "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.27.0/opentelemetry-javaagent.jar",
                    "algorithm": "sha256",
                    "digest": "bd01fea1304e8c8803fff827a0bdda02b2266742a85c62548053c6761474bb5b",
                    "provenanceUrl": "https://api.github.com/repos/open-telemetry/opentelemetry-java-instrumentation/releases/tags/v2.27.0"
                  }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "language": "dotnet",
      "labelKey": "instrumentation.language.dotnet",
      "frameworks": [
        {
          "framework": "aspnet_core",
          "labelKey": "instrumentation.framework.aspnet_core",
          "methods": [
            {
              "method": "zero_code",
              "labelKey": "instrumentation.method.zero_code",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes", "windows_service"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64", "windows_amd64"],
              "signals": {"metrics": "supported", "logs": "supported", "traces": "supported"},
              "component": {
                "name": "OpenTelemetry .NET Automatic Instrumentation",
                "sourceUrl": "https://github.com/open-telemetry/opentelemetry-dotnet-instrumentation/releases/tag/v1.15.0",
                "version": "1.15.0",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [],
                "artifacts": []
              }
            }
          ]
        }
      ]
    },
    {
      "language": "nodejs",
      "labelKey": "instrumentation.language.nodejs",
      "frameworks": [
        {
          "framework": "nodejs",
          "labelKey": "instrumentation.framework.nodejs",
          "methods": [
            {
              "method": "zero_code",
              "labelKey": "instrumentation.method.zero_code",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64", "windows_amd64"],
              "signals": {"metrics": "supported", "logs": "unsupported", "traces": "supported"},
              "component": {
                "name": "@opentelemetry/auto-instrumentations-node",
                "sourceUrl": "https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node/v/0.78.0",
                "version": "0.78.0",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [
                  {
                    "name": "@opentelemetry/api",
                    "sourceUrl": "https://www.npmjs.com/package/@opentelemetry/api/v/1.9.1",
                    "version": "1.9.1",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.api",
                    "official": true,
                    "bundledWithHertzBeat": false
                  }
                ],
                "artifacts": []
              }
            }
          ]
        },
        {
          "framework": "express",
          "labelKey": "instrumentation.framework.express",
          "methods": [
            {
              "method": "zero_code",
              "labelKey": "instrumentation.method.zero_code",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64", "windows_amd64"],
              "signals": {"metrics": "supported", "logs": "unsupported", "traces": "supported"},
              "component": {
                "name": "@opentelemetry/auto-instrumentations-node",
                "sourceUrl": "https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node/v/0.78.0",
                "version": "0.78.0",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [
                  {
                    "name": "@opentelemetry/api",
                    "sourceUrl": "https://www.npmjs.com/package/@opentelemetry/api/v/1.9.1",
                    "version": "1.9.1",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.api",
                    "official": true,
                    "bundledWithHertzBeat": false
                  }
                ],
                "artifacts": []
              }
            }
          ]
        }
      ]
    },
    {
      "language": "python",
      "labelKey": "instrumentation.language.python",
      "frameworks": [
        {
          "framework": "django",
          "labelKey": "instrumentation.framework.django",
          "methods": [
            {
              "method": "zero_code",
              "labelKey": "instrumentation.method.zero_code",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64", "windows_amd64"],
              "signals": {"metrics": "supported", "logs": "preview", "traces": "supported"},
              "component": {
                "name": "opentelemetry-distro",
                "sourceUrl": "https://pypi.org/project/opentelemetry-distro/0.64b0/",
                "version": "0.64b0",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [
                  {
                    "name": "opentelemetry-exporter-otlp",
                    "sourceUrl": "https://pypi.org/project/opentelemetry-exporter-otlp/1.43.0/",
                    "version": "1.43.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.exporter",
                    "official": true,
                    "bundledWithHertzBeat": false
                  },
                  {
                    "name": "opentelemetry-instrumentation-logging",
                    "sourceUrl": "https://pypi.org/project/opentelemetry-instrumentation-logging/0.64b0/",
                    "version": "0.64b0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.framework_instrumentation",
                    "official": true,
                    "bundledWithHertzBeat": false
                  }
                ],
                "artifacts": []
              }
            }
          ]
        },
        {
          "framework": "flask",
          "labelKey": "instrumentation.framework.flask",
          "methods": [
            {
              "method": "zero_code",
              "labelKey": "instrumentation.method.zero_code",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64", "windows_amd64"],
              "signals": {"metrics": "supported", "logs": "preview", "traces": "supported"},
              "component": {
                "name": "opentelemetry-distro",
                "sourceUrl": "https://pypi.org/project/opentelemetry-distro/0.64b0/",
                "version": "0.64b0",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [
                  {
                    "name": "opentelemetry-exporter-otlp",
                    "sourceUrl": "https://pypi.org/project/opentelemetry-exporter-otlp/1.43.0/",
                    "version": "1.43.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.exporter",
                    "official": true,
                    "bundledWithHertzBeat": false
                  },
                  {
                    "name": "opentelemetry-instrumentation-logging",
                    "sourceUrl": "https://pypi.org/project/opentelemetry-instrumentation-logging/0.64b0/",
                    "version": "0.64b0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.framework_instrumentation",
                    "official": true,
                    "bundledWithHertzBeat": false
                  }
                ],
                "artifacts": []
              }
            }
          ]
        }
      ]
    },
    {
      "language": "php",
      "labelKey": "instrumentation.language.php",
      "frameworks": [
        {
          "framework": "php_generic",
          "labelKey": "instrumentation.framework.php_generic",
          "methods": [
            {
              "method": "zero_code",
              "labelKey": "instrumentation.method.zero_code",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64"],
              "signals": {"metrics": "unsupported", "logs": "unsupported", "traces": "supported"},
              "component": {
                "name": "OpenTelemetry PHP extension",
                "sourceUrl": "https://pecl.php.net/package/opentelemetry/1.2.1",
                "version": "1.2.1",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [
                  {
                    "name": "open-telemetry/sdk",
                    "sourceUrl": "https://packagist.org/packages/open-telemetry/sdk#1.14.0",
                    "version": "1.14.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.sdk",
                    "official": true,
                    "bundledWithHertzBeat": false
                  },
                  {
                    "name": "open-telemetry/exporter-otlp",
                    "sourceUrl": "https://packagist.org/packages/open-telemetry/exporter-otlp#1.4.0",
                    "version": "1.4.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.exporter",
                    "official": true,
                    "bundledWithHertzBeat": false
                  },
                  {
                    "name": "open-telemetry/opentelemetry-auto-psr18",
                    "sourceUrl": "https://packagist.org/packages/open-telemetry/opentelemetry-auto-psr18#1.2.0",
                    "version": "1.2.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.framework_instrumentation",
                    "official": true,
                    "bundledWithHertzBeat": false
                  }
                ],
                "artifacts": []
              }
            }
          ]
        },
        {
          "framework": "laravel",
          "labelKey": "instrumentation.framework.laravel",
          "methods": [
            {
              "method": "zero_code",
              "labelKey": "instrumentation.method.zero_code",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64"],
              "signals": {"metrics": "unsupported", "logs": "unsupported", "traces": "supported"},
              "component": {
                "name": "OpenTelemetry PHP extension",
                "sourceUrl": "https://pecl.php.net/package/opentelemetry/1.2.1",
                "version": "1.2.1",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [
                  {
                    "name": "open-telemetry/sdk",
                    "sourceUrl": "https://packagist.org/packages/open-telemetry/sdk#1.14.0",
                    "version": "1.14.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.sdk",
                    "official": true,
                    "bundledWithHertzBeat": false
                  },
                  {
                    "name": "open-telemetry/exporter-otlp",
                    "sourceUrl": "https://packagist.org/packages/open-telemetry/exporter-otlp#1.4.0",
                    "version": "1.4.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.exporter",
                    "official": true,
                    "bundledWithHertzBeat": false
                  },
                  {
                    "name": "open-telemetry/opentelemetry-auto-laravel",
                    "sourceUrl": "https://packagist.org/packages/open-telemetry/opentelemetry-auto-laravel#1.7.0",
                    "version": "1.7.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.framework_instrumentation",
                    "official": true,
                    "bundledWithHertzBeat": false
                  }
                ],
                "artifacts": []
              }
            }
          ]
        }
      ]
    },
    {
      "language": "go",
      "labelKey": "instrumentation.language.go",
      "frameworks": [
        {
          "framework": "go_generic",
          "labelKey": "instrumentation.framework.go_generic",
          "methods": [
            {
              "method": "sdk",
              "labelKey": "instrumentation.method.sdk",
              "preview": false,
              "environments": ["vm", "docker", "kubernetes"],
              "platforms": ["linux_amd64", "linux_arm64", "macos_amd64", "macos_arm64", "windows_amd64"],
              "signals": {"metrics": "supported", "logs": "preview", "traces": "supported"},
              "component": {
                "name": "OpenTelemetry Go SDK",
                "sourceUrl": "https://github.com/open-telemetry/opentelemetry-go/releases/tag/v1.43.0",
                "version": "1.43.0",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [
                  {
                    "name": "go.opentelemetry.io/otel/sdk/metric",
                    "sourceUrl": "https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric@v1.43.0",
                    "version": "1.43.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.metrics_sdk",
                    "official": true,
                    "bundledWithHertzBeat": false
                  },
                  {
                    "name": "go.opentelemetry.io/contrib/exporters/autoexport",
                    "sourceUrl": "https://pkg.go.dev/go.opentelemetry.io/contrib/exporters/autoexport@v0.65.0",
                    "version": "0.65.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.exporter",
                    "official": true,
                    "bundledWithHertzBeat": false
                  },
                  {
                    "name": "go.opentelemetry.io/otel/sdk/log",
                    "sourceUrl": "https://pkg.go.dev/go.opentelemetry.io/otel/sdk/log@v0.19.0",
                    "version": "0.19.0",
                    "license": "Apache-2.0",
                    "purposeKey": "instrumentation.dependency.logs_sdk",
                    "official": true,
                    "bundledWithHertzBeat": false
                  }
                ],
                "artifacts": []
              }
            },
            {
              "method": "ebpf",
              "labelKey": "instrumentation.method.ebpf",
              "preview": true,
              "environments": ["vm", "docker", "kubernetes"],
              "platforms": ["linux_amd64", "linux_arm64"],
              "signals": {"metrics": "unsupported", "logs": "unsupported", "traces": "preview"},
              "component": {
                "name": "OpenTelemetry Go zero-code instrumentation",
                "sourceUrl": "https://github.com/open-telemetry/opentelemetry-go-instrumentation/releases/tag/v0.19.0",
                "version": "0.19.0",
                "versionPolicy": "pinned",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [],
                "artifacts": []
              }
            }
          ]
        }
      ]
    },
    {
      "language": "generic",
      "labelKey": "instrumentation.language.generic",
      "frameworks": [
        {
          "framework": "generic",
          "labelKey": "instrumentation.framework.generic",
          "methods": [
            {
              "method": "sdk",
              "labelKey": "instrumentation.method.sdk",
              "preview": true,
              "environments": ["vm", "docker", "kubernetes", "windows_service"],
              "platforms": ["any"],
              "signals": {"metrics": "preview", "logs": "preview", "traces": "preview"},
              "component": {
                "name": "Official OpenTelemetry SDK",
                "sourceUrl": "https://opentelemetry.io/docs/languages/",
                "version": null,
                "versionPolicy": "language_specific",
                "license": "Apache-2.0",
                "installationLocationKey": "instrumentation.location.application_host",
                "official": true,
                "bundledWithHertzBeat": false,
                "dependencies": [],
                "artifacts": []
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Render request and response example

Request:

```json
{
  "schemaVersion": 1,
  "language": "nodejs",
  "framework": "express",
  "method": "zero_code",
  "environment": "docker",
  "platform": "linux_amd64",
  "collector": {
    "collectorId": "collector-east",
    "otlpHttpEndpoint": "http://collector.internal:4318",
    "otlpGrpcEndpoint": "http://collector.internal:4317",
    "authorizationHeader": "Authorization"
  },
  "service": {
    "name": "checkout-api",
    "namespace": "commerce",
    "environment": "prod"
  }
}
```

Response `data`:

```json
{
  "schemaVersion": 1,
  "selection": {
    "language": "nodejs",
    "framework": "express",
    "method": "zero_code",
    "environment": "docker",
    "platform": "linux_amd64"
  },
  "signals": {"metrics": "supported", "logs": "unsupported", "traces": "supported"},
  "component": {
    "name": "@opentelemetry/auto-instrumentations-node",
    "sourceUrl": "https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node/v/0.78.0",
    "version": "0.78.0",
    "versionPolicy": "pinned",
    "license": "Apache-2.0",
    "installationLocationKey": "instrumentation.location.application_host",
    "official": true,
    "bundledWithHertzBeat": false,
    "dependencies": [
      {
        "name": "@opentelemetry/api",
        "sourceUrl": "https://www.npmjs.com/package/@opentelemetry/api/v/1.9.1",
        "version": "1.9.1",
        "license": "Apache-2.0",
        "purposeKey": "instrumentation.dependency.api",
        "official": true,
        "bundledWithHertzBeat": false
      }
    ],
    "artifacts": []
  },
  "secretPlaceholders": {
    "authorizationToken": {
      "marker": "${HERTZBEAT_TOKEN}",
      "valueFormat": "url_unreserved",
      "replacement": "raw"
    }
  },
  "steps": [
    {
      "id": "install",
      "type": "install",
      "titleKey": "instrumentation.step.install",
      "executionLocationKey": "instrumentation.location.application_host",
      "snippets": [
        {
          "id": "install-command",
          "language": "bash",
          "content": "npm install --save @opentelemetry/api@1.9.1 @opentelemetry/auto-instrumentations-node@0.78.0",
          "secretPlaceholders": []
        }
      ]
    },
    {
      "id": "configure",
      "type": "configure",
      "titleKey": "instrumentation.step.configure",
      "executionLocationKey": "instrumentation.location.application_environment",
      "snippets": [
        {
          "id": "otel-environment",
          "language": "bash",
          "content": "export OTEL_SERVICE_NAME=checkout-api\nexport OTEL_RESOURCE_ATTRIBUTES='service.namespace=commerce,deployment.environment.name=prod,hertzbeat.collector.id=collector-east'\nexport OTEL_EXPORTER_OTLP_ENDPOINT=http://collector.internal:4318\nexport OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf\nexport OTEL_TRACES_EXPORTER=otlp\nexport OTEL_METRICS_EXPORTER=otlp\nexport OTEL_LOGS_EXPORTER=none\nexport OTEL_EXPORTER_OTLP_HEADERS='Authorization=Bearer%20${HERTZBEAT_TOKEN}'",
          "secretPlaceholders": ["authorizationToken"]
        }
      ]
    },
    {
      "id": "start",
      "type": "start",
      "titleKey": "instrumentation.step.start",
      "executionLocationKey": "instrumentation.location.application_process",
      "snippets": [
        {
          "id": "start-command",
          "language": "bash",
          "content": "NODE_OPTIONS='--require @opentelemetry/auto-instrumentations-node/register' node app.js",
          "secretPlaceholders": []
        }
      ]
    },
    {
      "id": "container",
      "type": "container",
      "titleKey": "instrumentation.step.container",
      "executionLocationKey": "instrumentation.location.container_definition",
      "snippets": [
        {
          "id": "container-config",
          "language": "dockerfile",
          "content": "ENV NODE_OPTIONS=\"--require @opentelemetry/auto-instrumentations-node/register\"",
          "secretPlaceholders": []
        }
      ]
    },
    {
      "id": "disable",
      "type": "disable",
      "titleKey": "instrumentation.step.disable",
      "executionLocationKey": "instrumentation.location.application_process",
      "snippets": [
        {
          "id": "disable-command",
          "language": "bash",
          "content": "# Remove the OpenTelemetry entry from NODE_OPTIONS, then restart",
          "secretPlaceholders": []
        }
      ]
    }
  ]
}
```

## Detection request and response example

Request:

```json
{
  "schemaVersion": 1,
  "language": "java",
  "framework": "spring_boot",
  "method": "zero_code",
  "environment": "docker",
  "platform": "linux_amd64",
  "service": {
    "name": "checkout-api",
    "namespace": "commerce",
    "environment": "prod"
  },
  "collectorId": "collector-east",
  "startedAt": 1710000000000
}
```

Response `data` after a real adapter receives Metrics and Traces while Logs remain pending:

```json
{
  "schemaVersion": 1,
  "detectedAt": 1710000005000,
  "context": {
    "language": "java",
    "framework": "spring_boot",
    "method": "zero_code",
    "environment": "docker",
    "platform": "linux_amd64",
    "service": {
      "name": "checkout-api",
      "namespace": "commerce",
      "environment": "prod"
    },
    "collectorId": "collector-east",
    "startedAt": 1710000000000
  },
  "signals": {
    "metrics": {"status": "received", "lastReceivedAt": 1710000004200, "errorCode": null},
    "logs": {"status": "waiting", "lastReceivedAt": null, "errorCode": "signal_not_received"},
    "traces": {"status": "received", "lastReceivedAt": 1710000004500, "errorCode": null}
  },
  "polling": {
    "decision": "continue_polling",
    "pollAfterMs": 3000,
    "deadlineAt": 1710000120000
  },
  "queryJumpContext": {
    "serviceName": "checkout-api",
    "serviceNamespace": "commerce",
    "environment": "prod",
    "collectorId": "collector-east",
    "startedAt": 1710000000000,
    "detectedAt": 1710000005000
  },
  "queryJumps": [
    {"signal": "metrics", "enabled": true, "context": {"serviceName": "checkout-api", "serviceNamespace": "commerce", "environment": "prod", "collectorId": "collector-east", "startedAt": 1710000000000, "detectedAt": 1710000005000}},
    {"signal": "logs", "enabled": false, "context": {"serviceName": "checkout-api", "serviceNamespace": "commerce", "environment": "prod", "collectorId": "collector-east", "startedAt": 1710000000000, "detectedAt": 1710000005000}},
    {"signal": "traces", "enabled": true, "context": {"serviceName": "checkout-api", "serviceNamespace": "commerce", "environment": "prod", "collectorId": "collector-east", "startedAt": 1710000000000, "detectedAt": 1710000005000}}
  ]
}
```

Stable error codes are `signal_not_received`, `signal_not_supported`, `storage_unavailable`,
`storage_query_failed`, `collector_unavailable`, `authentication_failed`, and `invalid_context`.
