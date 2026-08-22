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

package org.apache.hertzbeat.observability.service;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

/**
 * Canonical OTLP log ingestion boundary shared by the HTTP and gRPC transports.
 */
public interface OtlpLogIngestionService {

    /**
     * Decode and ingest an OTLP/HTTP log request.
     *
     * @param content encoded OTLP request body
     * @param headers request headers
     * @return an OTLP response encoded for the request content type
     */
    ResponseEntity<byte[]> ingestHttp(byte[] content, HttpHeaders headers);

    /**
     * Decode and ingest an OTLP/gRPC protobuf request.
     *
     * @param content encoded {@code ExportLogsServiceRequest}
     * @return encoded {@code ExportLogsServiceResponse}
     */
    byte[] ingestProtobuf(byte[] content);
}
