package org.dromara.hertzbeat.manager.service.impl;

import com.obs.services.ObsClient;
import com.obs.services.model.ListObjectsRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.manager.pojo.dto.FileDTO;
import org.dromara.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.dromara.hertzbeat.manager.service.ObjectStoreService;

import java.io.InputStream;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 华为云存储服务
 *
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * Created by gcdd1993 on 2023/9/13
 */
@Slf4j
@RequiredArgsConstructor
public class ObsObjectStoreServiceImpl implements ObjectStoreService {
    private final ObsClient obsClient;
    private final String bucketName;
    private final String rootPath;

    @Override
    public boolean upload(String relativePath, String fileName, InputStream is) {
        var objectName = rootPath + "/" + relativePath + "/" + fileName;
        var response = obsClient.putObject(bucketName, objectName, is);
        return Objects.equals(response.getStatusCode(), 200);
    }

    @Override
    public FileDTO download(String relativePath) {
        var objectName = rootPath + "/" + relativePath;
        try {
            var obsObject = obsClient.getObject(bucketName, objectName);
            return new FileDTO(relativePath, obsObject.getObjectContent());
        } catch (Exception ex) {
            log.error("download file from obs error {}", objectName, ex);
            return null;
        }
    }

    @Override
    public List<FileDTO> list(String dir) {
        var path = rootPath + "/" + dir;
        var request = new ListObjectsRequest(bucketName);
        request.setPrefix(path);
        return obsClient.listObjects(request).getObjects()
                .stream()
                .map(it -> new FileDTO(it.getObjectKey(), it.getObjectContent()))
                .collect(Collectors.toUnmodifiableList());
    }

    @Override
    public ObjectStoreDTO.Type type() {
        return ObjectStoreDTO.Type.OBS;
    }

}
