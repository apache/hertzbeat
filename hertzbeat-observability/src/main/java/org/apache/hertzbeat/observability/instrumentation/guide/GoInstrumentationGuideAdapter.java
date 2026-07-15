/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.instrumentation.guide;

import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.springframework.stereotype.Component;

/** Stable Go SDK guidance plus explicitly preview/WIP eBPF guidance. */
@Component
public class GoInstrumentationGuideAdapter implements InstrumentationGuideAdapter {

    @Override
    public Language language() {
        return Language.GO;
    }

    @Override
    public LanguageGuideSteps render(GuideRenderRequest request, MethodOption method) {
        return request.method() == Method.EBPF ? ebpf(request, method) : sdk(method);
    }

    private LanguageGuideSteps sdk(MethodOption method) {
        String version = method.component().version();
        String metricVersion = GuideAdapterSupport.dependencyVersion(
                method, "go.opentelemetry.io/otel/sdk/metric");
        String logVersion = GuideAdapterSupport.dependencyVersion(method, "go.opentelemetry.io/otel/sdk/log");
        String autoexportVersion = GuideAdapterSupport.dependencyVersion(
                method, "go.opentelemetry.io/contrib/exporters/autoexport");
        String install = "go get go.opentelemetry.io/otel@v" + version + " "
                + "go.opentelemetry.io/otel/sdk@v" + version + " "
                + "go.opentelemetry.io/otel/sdk/metric@v" + metricVersion + " "
                + "go.opentelemetry.io/otel/sdk/log@v" + logVersion + " "
                + "go.opentelemetry.io/contrib/exporters/autoexport@v" + autoexportVersion;
        return new LanguageGuideSteps(
                GuideAdapterSupport.install(GuideAdapterSupport.snippet("install-command", "bash", install)),
                GuideAdapterSupport.start(
                        GuideAdapterSupport.snippet("sdk-initialization", "go", sdkInitialization()),
                        GuideAdapterSupport.snippet("application-startup", "go", sdkStartup()),
                        GuideAdapterSupport.snippet("start-command", "bash", "go run ./cmd/application")),
                GuideAdapterSupport.container(GuideAdapterSupport.snippet(
                        "container-config", "dockerfile", "RUN go build -o /application ./cmd/application")),
                GuideAdapterSupport.disable(GuideAdapterSupport.snippet(
                        "disable-command",
                        "go",
                        "// Remove the Setup call and rebuild; the application retains normal behavior.")));
    }

    private String sdkInitialization() {
        return """
                import (
                    "context"
                    "errors"
                    "log"

                    "go.opentelemetry.io/contrib/exporters/autoexport"
                    "go.opentelemetry.io/otel"
                    "go.opentelemetry.io/otel/log/global"
                    sdklog "go.opentelemetry.io/otel/sdk/log"
                    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
                    sdktrace "go.opentelemetry.io/otel/sdk/trace"
                )

                func setupOpenTelemetry(ctx context.Context) (func(context.Context) error, error) {
                    spanExporter, err := autoexport.NewSpanExporter(ctx)
                    if err != nil {
                        return nil, err
                    }
                    tracerProvider := sdktrace.NewTracerProvider(sdktrace.WithBatcher(spanExporter))

                    metricReader, err := autoexport.NewMetricReader(ctx)
                    if err != nil {
                        _ = tracerProvider.Shutdown(ctx)
                        return nil, err
                    }
                    meterProvider := sdkmetric.NewMeterProvider(sdkmetric.WithReader(metricReader))

                    logExporter, err := autoexport.NewLogExporter(ctx)
                    if err != nil {
                        _ = meterProvider.Shutdown(ctx)
                        _ = tracerProvider.Shutdown(ctx)
                        return nil, err
                    }
                    loggerProvider := sdklog.NewLoggerProvider(sdklog.WithProcessor(sdklog.NewBatchProcessor(logExporter)))

                    otel.SetTracerProvider(tracerProvider)
                    otel.SetMeterProvider(meterProvider)
                    global.SetLoggerProvider(loggerProvider)
                    return func(ctx context.Context) error {
                        return errors.Join(
                            loggerProvider.Shutdown(ctx),
                            meterProvider.Shutdown(ctx),
                            tracerProvider.Shutdown(ctx),
                        )
                    }, nil
                }
                """;
    }

    private String sdkStartup() {
        return """
                shutdown, err := setupOpenTelemetry(context.Background())
                if err != nil {
                    log.Fatal(err)
                }
                defer func() {
                    if err := shutdown(context.Background()); err != nil {
                        log.Printf("OpenTelemetry shutdown failed: %v", err)
                    }
                }()
                """;
    }

    private LanguageGuideSteps ebpf(GuideRenderRequest request, MethodOption method) {
        String version = method.component().version();
        String install = "git clone --branch v" + version
                + " --depth 1 https://github.com/open-telemetry/opentelemetry-go-instrumentation.git\n"
                + "cd opentelemetry-go-instrumentation && make build";
        String start = "sudo --preserve-env=OTEL_SERVICE_NAME,OTEL_RESOURCE_ATTRIBUTES,"
                + "OTEL_EXPORTER_OTLP_ENDPOINT,OTEL_EXPORTER_OTLP_PROTOCOL,OTEL_EXPORTER_OTLP_HEADERS,"
                + "OTEL_TRACES_EXPORTER,OTEL_METRICS_EXPORTER,OTEL_LOGS_EXPORTER "
                + "OTEL_GO_AUTO_TARGET_EXE=/absolute/path/to/application ./otel-go-instrumentation";
        String container = request.environment() == Environment.KUBERNETES
                ? "# Preview/WIP: use otel/autoinstrumentation-go as a privileged sidecar with shared process namespace"
                : "# Preview/WIP: use otel/autoinstrumentation-go with privileged=true and pid=host";
        return new LanguageGuideSteps(
                GuideAdapterSupport.install(GuideAdapterSupport.snippet(
                        "preview-install-command", "bash", "# Preview/WIP\n" + install)),
                GuideAdapterSupport.start(GuideAdapterSupport.snippet(
                        "preview-start-command", "bash", "# Preview/WIP\n" + start)),
                GuideAdapterSupport.container(GuideAdapterSupport.snippet(
                        "preview-container-config", "yaml", container)),
                GuideAdapterSupport.disable(GuideAdapterSupport.snippet(
                        "preview-disable-command", "bash", "sudo pkill -TERM -x otel-go-instrumentation")));
    }
}
