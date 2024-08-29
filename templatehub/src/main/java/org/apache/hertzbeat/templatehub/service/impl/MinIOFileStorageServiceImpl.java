package org.apache.hertzbeat.templatehub.service.impl;

import io.minio.*;
import io.minio.errors.MinioException;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

@Slf4j
@Service
public class MinIOFileStorageServiceImpl implements FileStorageService {

    @Value("${minio.endpoint}")
    private String minioEndpoint;

    @Value("${minio.accessKey}")
    private String accessKey;

    @Value("${minio.secretKey}")
    private String secretKey;

    @Value("${minio.bucketName}")
    private String bucketName;

    private final MinioClient minioClient;

    public MinIOFileStorageServiceImpl(
            @Value("${minio.endpoint}") String minioEndpoint,
            @Value("${minio.accessKey}") String accessKey,
            @Value("${minio.secretKey}") String secretKey) {
        this.minioClient = MinioClient.builder()
                .endpoint(minioEndpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    /**
     * uploadFile
     *
     * @param file Upload file information
     * @param path Storage path in MinIO
     */
    @Override
    public void uploadFile(MultipartFile file, String path, String fileName) {
        try {

            if(minioEndpoint==null||accessKey==null||secretKey==null){
                throw new IllegalArgumentException("Minio configuration error");
            }

            // Check if the bucket exists, if not, create it
            boolean isExist = minioClient.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(bucketName)
                            .build());
            if (!isExist) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(bucketName)
                                .build());
            }

            // Upload files to bucket
            String contentType = file.getContentType();
            InputStream inputStream = file.getInputStream();
            long size = file.getSize();

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .stream(inputStream, size, -1)
                            .contentType(contentType)
                            .object(path+"/"+fileName)
                            .bucket(bucketName)
                            .build());
        } catch (MinioException | NoSuchAlgorithmException | InvalidKeyException | IOException e) {
            throw new RuntimeException("File upload error:", e);
        }
//        return path+"/"+fileName;
    }

    @Override
    public void deleteFile(String path, String fileName) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(path + "/" + fileName)
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Error deleting file from MinIO", e);
        }
    }

    @Override
    public Resource downloadFile(String path, String fileName) {
        try {
            InputStream inputStream = minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(path + "/" + fileName)
                    .build());
            return new InputStreamResource(inputStream);
        } catch (MinioException | IOException e) {
            throw new RuntimeException("Error downloading file from MinIO", e);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }


//    /**
//     * Retrieve file external links
//     * @param path File Path
//     * @param expires Expiration time unit: days
//     * @return url
//     */
//    @Override
//    public String getDownloadUrl(String path, Integer expires) throws Exception {
//
//        MinioClient minioClient =MinioClient.builder()
//                .endpoint(minioEndpoint)
//                .credentials(accessKey,secretKey)
//                .build();
//
//        GetPresignedObjectUrlArgs args = GetPresignedObjectUrlArgs.builder()
//                                                                .method(Method.GET)
//                                                                .expiry(expires, TimeUnit.DAYS)
//                                                                .object(path)
//                                                                .bucket(bucketName)
//                                                                .build();
//        return minioClient.getPresignedObjectUrl(args);
//    }
}
