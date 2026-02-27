/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.push.service;

import java.io.InputStream;
import org.springframework.stereotype.Service;

/**
 * push gateway service
 */

@Service
public interface PushGatewayService {


    /**
     * push prometheus metrics data
     * @param inputStream input stream
     * @param job job name, maybe null
     * @param instance instance name, maybe null
     * @return push success or not
     */
    boolean pushPrometheusMetrics(InputStream inputStream, String job, String instance);

}
