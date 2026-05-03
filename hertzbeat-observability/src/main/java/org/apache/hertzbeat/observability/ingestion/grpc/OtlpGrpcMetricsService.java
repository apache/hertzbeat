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

package org.apache.hertzbeat.observability.ingestion.grpc;

import io.grpc.stub.StreamObserver;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse;
import io.opentelemetry.proto.collector.metrics.v1.MetricsServiceGrpc;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.observability.ingestion.service.OtlpGrpcIngestionService;
import org.springframework.stereotype.Service;

/**
 * OTLP gRPC metrics service.
 */
@Service
@RequiredArgsConstructor
public class OtlpGrpcMetricsService extends MetricsServiceGrpc.MetricsServiceImplBase {

    private final OtlpGrpcIngestionService otlpGrpcIngestionService;

    @Override
    public void export(ExportMetricsServiceRequest request,
                       StreamObserver<ExportMetricsServiceResponse> responseObserver) {
        try {
            responseObserver.onNext(otlpGrpcIngestionService.ingestMetricsGrpc(request));
            responseObserver.onCompleted();
        } catch (RuntimeException ex) {
            responseObserver.onError(ex);
        }
    }
}
