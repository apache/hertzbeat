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

package org.apache.hertzbeat.manager.service.entity;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.base.dao.LabelDao;
import org.apache.hertzbeat.base.service.LabelService;
import org.apache.hertzbeat.common.entity.manager.Label;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor submitted-label persistence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorLabelWriteModelServiceTest {

    @InjectMocks
    private OldMonitorLabelWriteModelService oldMonitorLabelWriteModelService;

    @Mock
    private LabelDao labelDao;

    @Mock
    private LabelService labelService;

    @Test
    void saveNewLabelsPersistsNewSubmittedLabels() {
        Map<String, String> labels = Map.of("env", "prod");
        List<Label> newLabels = List.of(Label.builder().name("env").tagValue("prod").build());
        when(labelService.determineNewLabels(labels.entrySet())).thenReturn(newLabels);

        oldMonitorLabelWriteModelService.saveNewLabels(labels);

        verify(labelService).determineNewLabels(labels.entrySet());
        verify(labelDao).saveAll(newLabels);
    }

    @Test
    void saveNewLabelsSkipsPersistenceWhenLabelsAlreadyExist() {
        Map<String, String> labels = Map.of("env", "prod");
        when(labelService.determineNewLabels(labels.entrySet())).thenReturn(List.of());

        oldMonitorLabelWriteModelService.saveNewLabels(labels);

        verify(labelService).determineNewLabels(labels.entrySet());
        verifyNoMoreInteractions(labelDao);
    }

    @Test
    void saveNewLabelsSkipsEmptySubmittedLabels() {
        oldMonitorLabelWriteModelService.saveNewLabels(Map.of());

        verifyNoInteractions(labelService, labelDao);
    }

    @Test
    void saveNewLabelsSkipsNullSubmittedLabels() {
        oldMonitorLabelWriteModelService.saveNewLabels(null);

        verifyNoInteractions(labelService, labelDao);
    }
}
