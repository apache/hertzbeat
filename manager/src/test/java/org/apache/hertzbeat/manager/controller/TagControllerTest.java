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

package org.apache.hertzbeat.manager.controller;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Tag;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.impl.TagServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test case for {@link TagController}
 */
@ExtendWith(MockitoExtension.class)
class TagControllerTest {

    private MockMvc mockMvc;

    @Mock
    private TagServiceImpl tagService;

    @InjectMocks
    private TagController tagController;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(tagController).build();
    }

    @Test
    void addNewTags() throws Exception {
        List<Tag> tags = new ArrayList<>();
        Tag tag = new Tag();
        tag.setId(87584674384L);
        tag.setName("app");
        tag.setTagValue("23");
        tag.setColor("#ffff");
        tag.setType((byte) 1);
        tag.setCreator("tom");
        tag.setModifier("tom");

        tags.add(tag);


        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/tag")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(tags)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"))
                .andReturn();
    }

    @Test
    void modifyMonitor() throws Exception {
        Tag tag = new Tag();
        tag.setId(87584674384L);
        tag.setName("app");
        tag.setTagValue("23");
        tag.setColor("#ffff");
        tag.setType((byte) 1);
        tag.setCreator("tom");
        tag.setModifier("tom");

        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/tag")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(tag)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Modify success"))
                .andReturn();
    }

    @Test
    void getTags() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/tag?type={type}&search={search}",
                        (byte) 1, "status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void deleteTags() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/tag")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .param("ids", "6565463543"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"))
                .andReturn();
    }

}
