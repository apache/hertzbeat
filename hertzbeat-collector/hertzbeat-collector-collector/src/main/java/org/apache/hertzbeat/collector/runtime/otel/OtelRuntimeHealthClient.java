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

package org.apache.hertzbeat.collector.runtime.otel;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Minimal loopback health and Ping client for the managed runtime.
 */
public class OtelRuntimeHealthClient {

    private final HttpClient client;

    public OtelRuntimeHealthClient() {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build());
    }

    OtelRuntimeHealthClient(HttpClient client) {
        this.client = client;
    }

    /**
     * Check whether the runtime health extension accepts requests.
     *
     * @param endpoint loopback endpoint
     * @param timeout request timeout
     * @return true only for a 2xx response
     */
    public boolean isHealthy(URI endpoint, Duration timeout) {
        HttpRequest request = HttpRequest.newBuilder(endpoint).timeout(timeout).GET().build();
        try {
            int status = client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            return status >= 200 && status < 300;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException unavailable) {
            return false;
        }
    }
}
