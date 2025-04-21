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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashSet;
import java.util.Optional;

import org.apache.hertzbeat.common.entity.manager.Label;
import org.apache.hertzbeat.manager.dao.LabelDao;
import org.apache.hertzbeat.manager.service.impl.LabelServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

/**
 * Test case for {@link LabelService}
 */
@ExtendWith(MockitoExtension.class)
class LabelServiceTest {
    
    @InjectMocks
    private LabelServiceImpl labelService;
    
    @Mock
    private LabelDao labelDao;
    
    @Test
    void addLabel() {
        // Prepare test data
        Label label =  Label.builder().id(1L).name("tagname").tagValue("tagvalue").build();
        when(labelDao.findLabelByNameAndTagValue(anyString(), anyString())).thenReturn(Optional.empty());
        
        labelService.addLabel(label);
        
        verify(labelDao).save(label);
        
    }
    
    @Test
    void modifyLabel() {
        Label tag = Label.builder().id(1L).build();
        when(labelDao.findById(1L)).thenReturn(Optional.of(tag));
        when(labelDao.save(tag)).thenReturn(tag);
        assertDoesNotThrow(() -> labelService.modifyLabel(tag));
        reset();
        when(labelDao.findById(1L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> labelService.modifyLabel(tag));
    }
    
    @Test
    void getLabels() {
        when(labelDao.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(Page.empty());
        assertNotNull(labelService.getLabels(null, null, 1, 10));
    }
    
    @Test
    void deleteLabels() {
        assertDoesNotThrow(() -> labelService.deleteLabels(new HashSet<>(1)));
    }
}
