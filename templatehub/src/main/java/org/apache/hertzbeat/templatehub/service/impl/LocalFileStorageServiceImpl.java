package org.apache.hertzbeat.templatehub.service.impl;

import org.apache.hertzbeat.templatehub.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

@Service
public class LocalFileStorageServiceImpl implements FileStorageService {

    @Value("${local.storage.path}")
    private String storagePath;

    @Override
    public void uploadFile(MultipartFile file, String path, String fileName) {
        try {
            // Ensure the directory exists
            File directory = new File(storagePath+"/"+path);
            if (!directory.exists()) {
                boolean mkdir = directory.mkdirs();
                if(!mkdir){
                    throw new RuntimeException("Unable to create directory");
                }
            }

            // Define the file path
            File localFile = new File(directory,fileName);
            try (FileOutputStream outputStream = new FileOutputStream(localFile)) {
                outputStream.write(file.getBytes());
            }

            // Return the file URL (local file path in this case)
//            return localFile.toURI().toString();
        } catch (IOException e) {
            throw new RuntimeException("Error uploading file to local storage", e);
        }
    }

    @Override
    public void deleteFile(String path, String fileName) {
        File file = new File(storagePath + "/" + path + "/" + fileName);
        if (file.exists() && !file.delete()) {
            throw new RuntimeException("Error deleting file from local storage");
        }
    }

    @Override
    public Resource downloadFile(String path, String fileName) {
        File file = new File(storagePath + "/" + path + "/" + fileName);
        if (file.exists()) {
            return new FileSystemResource(file);
        } else {
            throw new RuntimeException("File not found");
        }
    }
}

