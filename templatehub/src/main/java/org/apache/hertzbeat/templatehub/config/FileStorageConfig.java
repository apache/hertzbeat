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
