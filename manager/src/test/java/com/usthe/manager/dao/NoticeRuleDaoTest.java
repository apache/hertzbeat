package com.usthe.manager.dao;

import com.usthe.common.entity.manager.NoticeRule;
import com.usthe.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Test case for {@link NoticeRuleDao}
 */
@Transactional
class NoticeRuleDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private NoticeRuleDao noticeRuleDao;

    @BeforeEach
    void setUp() {
        // insert notice rule with enable = true
        NoticeRule enabled = NoticeRule.builder()
                .name("mock notice rule")
                .enable(true)
                .filterAll(true)
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .modifier("mock")
                .creator("mock")
                .priorities(Collections.emptyList())
                .receiverId(1L)
                .receiverName("mock receiver")
                .tags(Collections.emptyList())
                .build();
        enabled = noticeRuleDao.saveAndFlush(enabled);
        assertNotNull(enabled);

        // insert notice rule with enable = false
        NoticeRule disabled = NoticeRule.builder()
                .id(2L)
                .name("mock notice rule")
                .enable(false)
                .filterAll(true)
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .modifier("mock")
                .creator("mock")
                .priorities(Collections.emptyList())
                .receiverId(1L)
                .receiverName("mock receiver")
                .tags(Collections.emptyList())
                .build();
        disabled = noticeRuleDao.saveAndFlush(disabled);
        assertNotNull(disabled);
    }

    @AfterEach
    void tearDown() {
        noticeRuleDao.deleteAll();
    }

    @Test
    void findNoticeRulesByEnableTrue() {
        List<NoticeRule> enabledList = noticeRuleDao.findNoticeRulesByEnableTrue();
        assertNotNull(enabledList);
        assertEquals(1, enabledList.size());
    }
}