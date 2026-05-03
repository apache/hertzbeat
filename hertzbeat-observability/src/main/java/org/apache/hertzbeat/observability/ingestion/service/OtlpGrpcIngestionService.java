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

package org.apache.hertzbeat.observability.ingestion.service;

import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

/**
 * Unified OTLP signal ingestion service for both HTTP and gRPC.
 */
public interface OtlpGrpcIngestionService {

    ResponseEntity<byte[]> ingestMetricsHttp(byte[] content, HttpHeaders requestHeaders);

    ResponseEntity<byte[]> ingestTracesHttp(byte[] content, HttpHeaders requestHeaders);

    ExportMetricsServiceResponse ingestMetricsGrpc(ExportMetricsServiceRequest request);

    ExportLogsServiceResponse ingestLogsGrpc(ExportLogsServiceRequest request);

    ExportTraceServiceResponse ingestTracesGrpc(ExportTraceServiceRequest request);

    List<String> getGrpcSupportedSignals();
}
