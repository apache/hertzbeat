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

package org.apache.hertzbeat.manager.service.ai;


import org.apache.hertzbeat.common.constants.AiTypeEnum;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;


/**
 * AI Service
 */
public interface AiService {

    /**
     * get AI type
     * @return     type
     */
    AiTypeEnum getType();

    /**
     * AI response
     * @param text  text
     * @return      AI response
     */
    Flux<ServerSentEvent<String>> requestAi(String text);

}
