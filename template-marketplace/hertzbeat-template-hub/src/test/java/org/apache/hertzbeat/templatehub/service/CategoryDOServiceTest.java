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

package org.apache.hertzbeat.templatehub.service;

import org.apache.hertzbeat.templatehub.model.DAO.CategoryDao;
import org.apache.hertzbeat.templatehub.model.DAO.TemplateDao;
import org.apache.hertzbeat.templatehub.model.DO.CategoryDO;
import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.apache.hertzbeat.templatehub.service.impl.CategoryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test case for {@link CategoryService}
 */
@ExtendWith(MockitoExtension.class)
class CategoryDOServiceTest {

    @InjectMocks
    private CategoryServiceImpl categoryService;

    @Mock
    private CategoryDao categoryDao;

    @Mock
    private TemplateDao templateDao;

    private CategoryDO mockCategoryDO;

    @BeforeEach
    void setUp() throws Exception {
        mockCategoryDO = new CategoryDO(1, "Test Category", "Description", "2024-09-28 10:00:00", "2024-09-28 10:00:00", 0);
    }

    @Test
    void testAddCategory() {
        when(categoryDao.save(any(CategoryDO.class))).thenReturn(mockCategoryDO);

        boolean result = categoryService.addCategory("Test Category", "Description", "2024-09-28 10:00:00");

        assertTrue(result);
        verify(categoryDao, times(1)).save(any(CategoryDO.class));
    }

    @Test
    void testModifyCategory_Success() {
        when(categoryDao.findById(mockCategoryDO.getId())).thenReturn(Optional.of(mockCategoryDO));

        boolean result = categoryService.modifyCategory(mockCategoryDO.getId(), "Updated Name", "Updated Description", "2024-09-28 10:00:00");

        assertTrue(result);
        verify(categoryDao, times(1)).save(mockCategoryDO);
    }

    @Test
    void testModifyCategory_NotFound() {
        when(categoryDao.findById(mockCategoryDO.getId())).thenReturn(Optional.empty());

        boolean result = categoryService.modifyCategory(mockCategoryDO.getId(), "Updated Name", "Updated Description", "2024-09-28 10:00:00");

        assertFalse(result);
        verify(categoryDao, never()).save(any(CategoryDO.class));
    }

    @Test
    void testDeleteCategory_Success() {
        when(templateDao.queryPageByCategory(Collections.singletonList(mockCategoryDO.getId()), 0, PageRequest.of(0, 1)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(categoryDao.deleteByIsDel(mockCategoryDO.getId())).thenReturn(1);

        boolean result = categoryService.deleteCategory(mockCategoryDO.getId());

        assertTrue(result);
        verify(categoryDao, times(1)).deleteByIsDel(mockCategoryDO.getId());
    }

    @Test
    void testDeleteCategory_HasTemplates() {
        TemplateDO mockTemplateDO = new TemplateDO(); // Mock template entity
        when(templateDao.queryPageByCategory(Collections.singletonList(mockCategoryDO.getId()), 0, PageRequest.of(0, 1)))
                .thenReturn(new PageImpl<>(List.of(mockTemplateDO)));

        boolean result = categoryService.deleteCategory(mockCategoryDO.getId());

        assertFalse(result);
        verify(categoryDao, never()).deleteByIsDel(mockCategoryDO.getId());
    }

    @Test
    void testGetAllCategoryByIsDel() {
        when(categoryDao.findAllByIsDel(0)).thenReturn(Collections.singletonList(mockCategoryDO));

        var categories = categoryService.getAllCategoryByIsDel(0);

        assertNotNull(categories);
        assertEquals(1, categories.size());
        assertEquals(mockCategoryDO.getName(), categories.get(0).getName());
    }

    @Test
    void testGetPageByIsDel() {
        Page<CategoryDO> page = new PageImpl<>(Collections.singletonList(mockCategoryDO));
        when(categoryDao.findAllByIsDel(0, PageRequest.of(0, 1))).thenReturn(page);

        Page<CategoryDO> resultPage = categoryService.getPageByIsDel(0, 0, 1);

        assertNotNull(resultPage);
        assertEquals(1, resultPage.getTotalElements());
        assertEquals(mockCategoryDO.getName(), resultPage.getContent().get(0).getName());
    }
}