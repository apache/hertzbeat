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

import org.apache.hertzbeat.templatehub.model.dao.CategoryDao;
import org.apache.hertzbeat.templatehub.model.dao.TemplateDao;
import org.apache.hertzbeat.templatehub.model.entity.Category;
import org.apache.hertzbeat.templatehub.model.entity.Template;
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
class CategoryServiceTest {

    @InjectMocks
    private CategoryServiceImpl categoryService;

    @Mock
    private CategoryDao categoryDao;

    @Mock
    private TemplateDao templateDao;

    private Category mockCategory;

    @BeforeEach
    void setUp() throws Exception {
        mockCategory = new Category(1, "Test Category", "Description", "2024-09-28 10:00:00", "2024-09-28 10:00:00", 0);
    }

    @Test
    void testAddCategory() {
        when(categoryDao.save(any(Category.class))).thenReturn(mockCategory);

        boolean result = categoryService.addCategory("Test Category", "Description", "2024-09-28 10:00:00");

        assertTrue(result);
        verify(categoryDao, times(1)).save(any(Category.class));
    }

    @Test
    void testModifyCategory_Success() {
        when(categoryDao.findById(mockCategory.getId())).thenReturn(Optional.of(mockCategory));

        boolean result = categoryService.modifyCategory(mockCategory.getId(), "Updated Name", "Updated Description", "2024-09-28 10:00:00");

        assertTrue(result);
        verify(categoryDao, times(1)).save(mockCategory);
    }

    @Test
    void testModifyCategory_NotFound() {
        when(categoryDao.findById(mockCategory.getId())).thenReturn(Optional.empty());

        boolean result = categoryService.modifyCategory(mockCategory.getId(), "Updated Name", "Updated Description", "2024-09-28 10:00:00");

        assertFalse(result);
        verify(categoryDao, never()).save(any(Category.class));
    }

    @Test
    void testDeleteCategory_Success() {
        when(templateDao.queryPageByCategory(Collections.singletonList(mockCategory.getId()), 0, PageRequest.of(0, 1)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(categoryDao.deleteByIsDel(mockCategory.getId())).thenReturn(1);

        boolean result = categoryService.deleteCategory(mockCategory.getId());

        assertTrue(result);
        verify(categoryDao, times(1)).deleteByIsDel(mockCategory.getId());
    }

    @Test
    void testDeleteCategory_HasTemplates() {
        Template mockTemplate = new Template(); // Mock template entity
        when(templateDao.queryPageByCategory(Collections.singletonList(mockCategory.getId()), 0, PageRequest.of(0, 1)))
                .thenReturn(new PageImpl<>(List.of(mockTemplate)));

        boolean result = categoryService.deleteCategory(mockCategory.getId());

        assertFalse(result);
        verify(categoryDao, never()).deleteByIsDel(mockCategory.getId());
    }

    @Test
    void testGetAllCategoryByIsDel() {
        when(categoryDao.findAllByIsDel(0)).thenReturn(Collections.singletonList(mockCategory));

        var categories = categoryService.getAllCategoryByIsDel(0);

        assertNotNull(categories);
        assertEquals(1, categories.size());
        assertEquals(mockCategory.getName(), categories.get(0).getName());
    }

    @Test
    void testGetPageByIsDel() {
        Page<Category> page = new PageImpl<>(Collections.singletonList(mockCategory));
        when(categoryDao.findAllByIsDel(0, PageRequest.of(0, 1))).thenReturn(page);

        Page<Category> resultPage = categoryService.getPageByIsDel(0, 0, 1);

        assertNotNull(resultPage);
        assertEquals(1, resultPage.getTotalElements());
        assertEquals(mockCategory.getName(), resultPage.getContent().get(0).getName());
    }
}