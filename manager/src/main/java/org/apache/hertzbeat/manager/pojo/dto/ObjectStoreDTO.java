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

package org.apache.hertzbeat.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * file storage container
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectStoreDTO<T> {

    /**
     * file storage service type
     */
    private Type type;

    /**
     * Configuration item
     */
    private T config;

    /**
     * file storage service type
     */
    public enum Type {

        /**
         * local file
         */
        FILE,

        /**
         * local database
         */
        DATABASE,

        /**
         * <a href="https://support.huaweicloud.com/obs/index.html">Huawei Cloud OBS</a>
         */
        OBS
    }

    /**
     * file storage configuration
     */
    @Data
    public static class ObsConfig {
        private String accessKey;
        private String secretKey;
        private String bucketName;
        private String endpoint;

        /**
         * Save path
         */
        private String savePath = "hertzbeat";
    }

}
