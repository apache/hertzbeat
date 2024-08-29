package org.apache.hertzbeat.templatehub.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    /**
     * Upload files to the storage system
     *
     * @param file MultipartFile
     */
    void uploadFile(MultipartFile file, String path, String fileName);

    void deleteFile(String path, String fileName);

    Resource downloadFile(String path, String fileName);
}
