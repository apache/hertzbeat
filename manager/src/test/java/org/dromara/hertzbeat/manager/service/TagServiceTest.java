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

package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.common.entity.manager.Tag;
import org.dromara.hertzbeat.manager.dao.TagDao;
import org.dromara.hertzbeat.manager.service.impl.TagServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

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
        when(tagDao.saveAll(anyList())).thenReturn(anyList());
        assertDoesNotThrow(() -> tagService.addTags(Collections.singletonList(new Tag())));
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
        Specification<Tag> specification = mock(Specification.class);
        when(tagDao.findAll(specification, PageRequest.of(1, 1))).thenReturn(Page.empty());
        assertNotNull(tagService.getTags(specification, PageRequest.of(1, 1)));
    }

    @Test
    void deleteTags() {
        doNothing().when(tagDao).deleteTagsByIdIn(anySet());
        assertDoesNotThrow(() -> tagService.deleteTags(new HashSet<>(1)));
    }
}