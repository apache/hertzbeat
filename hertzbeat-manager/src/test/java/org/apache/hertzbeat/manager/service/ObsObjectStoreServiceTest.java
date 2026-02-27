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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import com.obs.services.ObsClient;
import com.obs.services.model.ListObjectsRequest;
import com.obs.services.model.ObjectListing;
import com.obs.services.model.ObsObject;
import com.obs.services.model.PutObjectResult;
import java.io.InputStream;
import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.FileDTO;
import org.apache.hertzbeat.manager.service.impl.ObsObjectStoreServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * test case for {@link ObsObjectStoreServiceImpl}
 */

class ObsObjectStoreServiceTest {

    @Mock
    private ObsClient obsClient;

    private ObsObjectStoreServiceImpl service;

    private final String bucketName = "test-bucket";
    private final String rootPath = "root/path";

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        this.service = new ObsObjectStoreServiceImpl(
                obsClient,
                bucketName,
                rootPath
        );
    }

    @Test
    void testUpload() {

        String filePath = "file.txt";
        InputStream is = mock(InputStream.class);
        var response = mock(PutObjectResult.class);

        when(obsClient.putObject(eq(bucketName), anyString(), eq(is))).thenReturn(response);
        when(response.getStatusCode()).thenReturn(200);

        boolean result = service.upload(filePath, is);

        assertTrue(result);
        verify(obsClient, times(1)).putObject(eq(bucketName), anyString(), eq(is));
    }

    @Test
    void testRemove() {

        String filePath = "file.txt";

        service.remove(filePath);

        verify(obsClient, times(1)).deleteObject(eq(bucketName), anyString());
    }

    @Test
    void testIsExist() {

        String filePath = "file.txt";

        when(obsClient.doesObjectExist(eq(bucketName), anyString())).thenReturn(true);

        boolean result = service.isExist(filePath);

        assertTrue(result);
        verify(obsClient, times(1)).doesObjectExist(eq(bucketName), anyString());
    }

    @Test
    void testDownload() {

        String filePath = "file.txt";
        var obsObject = mock(ObsObject.class);

        when(obsClient.getObject(eq(bucketName), anyString())).thenReturn(obsObject);
        when(obsObject.getObjectContent()).thenReturn(mock(InputStream.class));

        FileDTO result = service.download(filePath);

        assertNotNull(result);
        assertEquals(filePath, result.getName());
        verify(obsClient, times(1)).getObject(eq(bucketName), anyString());
    }

    @Test
    void testList() {

        String dir = "some/dir";
        var listObjectsResponse = mock(ObjectListing.class);
        var objectSummary = mock(ObsObject.class);

        when(obsClient.listObjects(any(ListObjectsRequest.class))).thenReturn(listObjectsResponse);
        when(listObjectsResponse.getObjects()).thenReturn(List.of(objectSummary));
        when(objectSummary.getObjectKey()).thenReturn("some/dir/file.txt");
        when(objectSummary.getObjectContent()).thenReturn(mock(InputStream.class));

        List<FileDTO> result = service.list(dir);

        assertNotNull(result);
        assertFalse(result.isEmpty());
        verify(obsClient, times(1)).listObjects(any(ListObjectsRequest.class));
    }

}
