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

package org.apache.hertzbeat.templatehub.controller;

import org.apache.hertzbeat.templatehub.model.entity.Category;
import org.apache.hertzbeat.templatehub.service.CategoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

/**
 * Test case for {@link CategoryController}
 */
@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @InjectMocks
    private CategoryController categoryController;

    @Mock
    private CategoryService categoryService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        this.mockMvc = standaloneSetup(categoryController).build();
    }
    @Test
    public void testAddCategory_ValidInput() throws Exception {

        when(categoryService.addCategory(any(String.class), any(String.class), any(String.class))).thenReturn(true);

        mockMvc.perform(post("/category/upload/testName")
                        .param("description", "Test description")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    public void testAddCategory_InvalidInput() throws Exception {
        mockMvc.perform(post("/category/upload/{name}","testName")
                        .param("description", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testModifyCategory_ValidInput() throws Exception {
        // Mock the category service method
        when(categoryService.modifyCategory(anyInt(), any(String.class), any(String.class), any(String.class))).thenReturn(true);

        // Perform the request
        mockMvc.perform(post("/category/modify/1")
                        .param("name", "Updated Name")
                        .param("description", "Updated description")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    public void testModifyCategory_InvalidInput() throws Exception {
        mockMvc.perform(post("/category/modify/0")
                        .param("name", "")
                        .param("description", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testDeleteCategory_ValidId() throws Exception {
        when(categoryService.deleteCategory(anyInt())).thenReturn(true);

        mockMvc.perform(delete("/category/delete/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    public void testDeleteCategory_InvalidId() throws Exception {
        mockMvc.perform(delete("/category/delete/0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testGetAllCategory_ValidInput() throws Exception {
        List<Category> categories = Collections.singletonList(new Category());
        when(categoryService.getAllCategoryByIsDel(anyInt())).thenReturn(categories);

        mockMvc.perform(get("/category/all/0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    public void testGetAllCategory_InvalidInput() throws Exception {
        mockMvc.perform(get("/category/all/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testGetCategoryPageByIsDel_ValidInput() throws Exception {
        List<Category> categories = new ArrayList<>();
        categories.add(new Category());
        Page<Category> categoryPage = new PageImpl<>(categories);

        when(categoryService.getPageByIsDel(anyInt(), anyInt(), anyInt())).thenReturn(categoryPage);

        mockMvc.perform(get("/category/page/isDel/0?page=0&size=10"));

        verify(categoryService,times(1)).getPageByIsDel(anyInt(), anyInt(), anyInt());
    }

    @Test
    public void testGetCategoryPageByIsDel_InvalidInput() throws Exception {
        mockMvc.perform(get("/category/page/isDel/2?page=-1&size=0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

}