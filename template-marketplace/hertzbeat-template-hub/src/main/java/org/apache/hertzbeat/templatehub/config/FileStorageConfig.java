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

package org.apache.hertzbeat.templatehub.config;

import org.apache.hertzbeat.templatehub.service.FileStorageService;
import org.apache.hertzbeat.templatehub.service.impl.LocalFileStorageServiceImpl;
import org.apache.hertzbeat.templatehub.service.impl.MinIOFileStorageServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FileStorageConfig {

    @Value("${file.storage.type}")
    private String storageType;

    @Value("${minio.endpoint}")
    private String minioEndpoint;

    @Value("${minio.accessKey}")
    private String accessKey;

    @Value("${minio.secretKey}")
    private String secretKey;

    @Bean
    public FileStorageService fileStorageService() {
        if ("minio".equalsIgnoreCase(storageType)) {
            return new MinIOFileStorageServiceImpl(
                    minioEndpoint,
                    accessKey,
                    secretKey
            );
        } else if ("local".equalsIgnoreCase(storageType)) {
            return new LocalFileStorageServiceImpl();
        } else {
            throw new IllegalArgumentException("Invalid file storage type: " + storageType);
        }
    }
}
