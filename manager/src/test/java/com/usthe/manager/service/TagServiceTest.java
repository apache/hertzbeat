package com.usthe.manager.service;

import com.usthe.common.entity.manager.Tag;
import com.usthe.manager.dao.TagDao;
import com.usthe.manager.service.impl.TagServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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