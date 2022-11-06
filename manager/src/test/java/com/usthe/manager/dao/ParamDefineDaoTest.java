package com.usthe.manager.dao;

import com.usthe.common.entity.manager.ParamDefine;
import com.usthe.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Test case for {@link ParamDefineDao}
 */
@Transactional
class ParamDefineDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private ParamDefineDao paramDefineDao;

    @BeforeEach
    void setUp() {
        ParamDefine paramDefine = ParamDefine.builder()
                .app("mock app")
                .field("mock field")
                .defaultValue("mock default value")
                .limit((short) 1)
                .keyAlias("mock key alias")
                .valueAlias("mock value alias")
                .options(Collections.emptyList())
                .range("mock range")
                .name(new HashMap<>())
                .hide(true)
                .required(true)
                .type("mock type")
                .placeholder("mock placeholder")
                .creator("mock creator")
                .modifier("mock modifier")
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .build();

        paramDefine = paramDefineDao.saveAndFlush(paramDefine);
        assertNotNull(paramDefine);
    }

    @AfterEach
    void tearDown() {
        paramDefineDao.deleteAll();
    }

    @Test
    void findParamDefinesByApp() {
        List<ParamDefine> paramDefineList = paramDefineDao.findParamDefinesByApp("mock app");
        assertNotNull(paramDefineList);
        assertEquals(1, paramDefineList.size());
    }
}