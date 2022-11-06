package com.usthe.manager.dao;

import com.usthe.common.entity.manager.Tag;
import com.usthe.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link TagDao}
 */
@Transactional
class TagDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private TagDao tagDao;

    @BeforeEach
    void setUp() {
        Tag tag = Tag.builder()
                .name("mock tag")
                .value("mock value")
                .color("mock color")
                .type((byte) 1)
                .creator("mock creator")
                .modifier("mock modifier")
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .build();

        tag = tagDao.saveAndFlush(tag);
        assertNotNull(tag);
    }

    @AfterEach
    void tearDown() {
        tagDao.deleteAll();
    }

    @Test
    void deleteTagsByIdIn() {
        List<Tag> tagList = tagDao.findAll();

        assertNotNull(tagList);
        assertFalse(tagList.isEmpty());

        Set<Long> ids = tagList.stream().map(Tag::getId).collect(Collectors.toSet());
        assertDoesNotThrow(() -> tagDao.deleteTagsByIdIn(ids));

        tagList = tagDao.findAll();
        assertNotNull(tagList);
        assertTrue(tagList.isEmpty());
    }
}