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

package org.apache.hertzbeat.manager.service;

/**
 * <p>GeneralConfigService interface provides CRUD operations for configurations.</p>
 * @param <T> configuration type.
 * @version 1.0
 */
public interface GeneralConfigService<T> {

    /**
     * config type: email, sms
     * @return type string
     */
    String type();
    
    /**
     * save config
     * @param config need save configuration
     */
    void saveConfig(T config);

    /**
     * get config
     * @return query The configuration is queried
     */
    T getConfig();
    
    /**
     * handler after save config
     * @param config config
     */
    default void handler(T config) {}
}
