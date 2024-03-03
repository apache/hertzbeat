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

package org.dromara.hertzbeat.manager.service.impl;

import com.obs.services.ObsClient;
import com.obs.services.model.ListObjectsRequest;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.SignConstants;
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
public class ObsObjectStoreServiceImpl implements ObjectStoreService {
    private final ObsClient obsClient;
    private final String bucketName;
    private final String rootPath;

    public ObsObjectStoreServiceImpl(ObsClient obsClient, String bucketName, String rootPath) {
        this.obsClient = obsClient;
        this.bucketName = bucketName;
        if (rootPath.startsWith(SignConstants.RIGHT_DASH)) {
            this.rootPath = rootPath.substring(1);
        } else {
            this.rootPath = rootPath;
        }
    }

    @Override
    public boolean upload(String filePath, InputStream is) {
        var objectKey = getObjectKey(filePath);
        var response = obsClient.putObject(bucketName, objectKey, is);
        return Objects.equals(response.getStatusCode(), 200);
    }

    @Override
    public FileDTO download(String filePath) {
        var objectKey = getObjectKey(filePath);
        try {
            var obsObject = obsClient.getObject(bucketName, objectKey);
            return new FileDTO(filePath, obsObject.getObjectContent());
        } catch (Exception ex) {
            log.warn("download file from obs error {}", objectKey);
            return null;
        }
    }

    @Override
    public List<FileDTO> list(String dir) {
        var request = new ListObjectsRequest(bucketName);
        request.setPrefix(getObjectKey(dir));
        return obsClient.listObjects(request).getObjects()
                .stream()
                .map(it -> new FileDTO(it.getObjectKey(), it.getObjectContent()))
                .collect(Collectors.toUnmodifiableList());
    }

    @Override
    public ObjectStoreDTO.Type type() {
        return ObjectStoreDTO.Type.OBS;
    }

    private String getObjectKey(String filePath) {
        return rootPath + SignConstants.RIGHT_DASH + filePath;
    }

}
