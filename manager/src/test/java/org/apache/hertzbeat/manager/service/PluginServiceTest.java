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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.constants.PluginType;
import org.apache.hertzbeat.common.entity.dto.PluginUpload;
import org.apache.hertzbeat.common.entity.manager.PluginItem;
import org.apache.hertzbeat.common.entity.manager.PluginMetadata;
import org.apache.hertzbeat.manager.dao.PluginItemDao;
import org.apache.hertzbeat.manager.dao.PluginMetadataDao;
import org.apache.hertzbeat.manager.dao.PluginParamDao;
import org.apache.hertzbeat.manager.service.impl.PluginServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;

/**
 * Test case for {@link PluginService}
 */
@ExtendWith(MockitoExtension.class)
class PluginServiceTest {

    @InjectMocks
    private PluginServiceImpl pluginService;

    @Mock
    private PluginMetadataDao metadataDao;

    @Mock
    private PluginParamDao pluginParamDao;

    @Mock
    private PluginItemDao itemDao;


    @BeforeEach
    void setUp() {
        pluginService = new PluginServiceImpl(metadataDao, itemDao, pluginParamDao);
    }

    @Test
    void testSavePlugin() {

        List<PluginItem> pluginItems = Collections.singletonList(new PluginItem("org.apache.hertzbeat.PluginTest", PluginType.POST_ALERT));
        PluginMetadata metadata = new PluginMetadata();
        metadata.setItems(pluginItems);
        metadata.setParamCount(0);
        PluginServiceImpl service = spy(pluginService);
        doReturn(metadata).when(service).validateJarFile(any());

        MockMultipartFile mockFile = new MockMultipartFile("file", "test-plugin.jar", "application/java-archive", "plugin-content".getBytes());
        PluginUpload pluginUpload = new PluginUpload(mockFile, "Test Plugin", true);

        when(metadataDao.save(any(PluginMetadata.class))).thenReturn(new PluginMetadata());
        when(itemDao.saveAll(anyList())).thenReturn(Collections.emptyList());

        service.savePlugin(pluginUpload);
        verify(metadataDao, times(1)).save(any(PluginMetadata.class));
        verify(itemDao, times(1)).saveAll(anyList());

    }

    @Test
    void testUpdateStatus() {
        PluginMetadata plugin = new PluginMetadata();
        plugin.setId(1L);
        plugin.setEnableStatus(true);
        plugin.setName("test-plugin");

        when(metadataDao.findById(1L)).thenReturn(Optional.of(plugin));
        when(metadataDao.save(any(PluginMetadata.class))).thenReturn(plugin);
        assertDoesNotThrow(() -> pluginService.updateStatus(plugin));
    }

    @Test
    void testDeletePlugins() {
        PluginMetadata plugin = new PluginMetadata();
        plugin.setId(1L);
        plugin.setJarFilePath("path/to/plugin.jar");
        Set<Long> ids = new HashSet<>(Collections.singletonList(1L));

        when(metadataDao.findAllById(ids)).thenReturn(Collections.singletonList(plugin));
        when(metadataDao.findById(anyLong())).thenReturn(Optional.of(plugin));
        when(metadataDao.save(plugin)).thenReturn(plugin);
        doNothing().when(metadataDao).deleteById(1L);

        pluginService.deletePlugins(ids);
        verify(metadataDao, times(1)).deleteById(1L);
    }

    @Test
    void testGetPlugins() {
        Page<PluginMetadata> page = new PageImpl<>(Collections.singletonList(new PluginMetadata()));
        when(metadataDao.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(page);
        Page<PluginMetadata> result = pluginService.getPlugins(null, 0, 10);
        assertFalse(result.isEmpty());
        verify(metadataDao, times(1)).findAll(any(Specification.class), any(PageRequest.class));
    }

}
