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

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import org.apache.hertzbeat.common.entity.manager.Tag;
import org.apache.hertzbeat.manager.dao.TagDao;
import org.apache.hertzbeat.manager.service.impl.TagServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

/**
 * Test case for {@link TagService}
 */
@ExtendWith(MockitoExtension.class)
class TagServiceTest {
    
    @InjectMocks
    private TagServiceImpl tagService;
    
    @Mock
    private TagDao tagDao;
    
    @Test
    void addTags() {
        // Prepare test data
        List<Tag> tags = Collections.singletonList(
                Tag.builder().id(1L).name("tagname").tagValue("tagvalue").build()
        );
        when(tagDao.findTagByNameAndTagValue(anyString(), anyString())).thenReturn(Optional.empty());
        
        tagService.addTags(tags);
        
        verify(tagDao).saveAll(tags);
        
    }
    
    @Test
    void modifyTag() {
        Tag tag = Tag.builder().id(1L).build();
        when(tagDao.findById(1L)).thenReturn(Optional.of(tag));
        when(tagDao.save(tag)).thenReturn(tag);
        assertDoesNotThrow(() -> tagService.modifyTag(tag));
        reset();
        when(tagDao.findById(1L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> tagService.modifyTag(tag));
    }
    
    @Test
    void getTags() {
        when(tagDao.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(Page.empty());
        assertNotNull(tagService.getTags(null, null, 1, 10));
    }
    
    @Test
    void deleteTags() {
        assertDoesNotThrow(() -> tagService.deleteTags(new HashSet<>(1)));
    }
}
