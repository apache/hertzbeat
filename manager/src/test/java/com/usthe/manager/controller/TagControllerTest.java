package com.usthe.manager.controller;

import com.usthe.common.entity.manager.Tag;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
import com.usthe.manager.service.impl.TagServiceImpl;
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

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
        tag.setValue("23");
        tag.setColor("#ffff");
        tag.setType((byte) 1);
        tag.setCreator("tom");
        tag.setModifier("tom");

        tags.add(tag);


        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/tag")
                .contentType(MediaType.APPLICATION_JSON)
                .content(GsonUtil.toJson(tags)))
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
        tag.setValue("23");
        tag.setColor("#ffff");
        tag.setType((byte) 1);
        tag.setCreator("tom");
        tag.setModifier("tom");

        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/tag")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(tag)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Modify success"))
                .andReturn();

    }

    @Test
    void getTags() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/tag?type={type}&search={search}", (byte)1, "status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void deleteTags() throws Exception {
        List<Long> ids = new ArrayList<>();
        ids.add(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/tag")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"))
                .andReturn();

    }

}