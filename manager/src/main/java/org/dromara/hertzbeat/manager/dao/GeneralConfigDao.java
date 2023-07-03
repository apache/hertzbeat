package org.dromara.hertzbeat.manager.dao;

import org.dromara.hertzbeat.common.entity.manager.GeneralConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Component;

/**
 * 公共服务端配置Dao
 * todo common config data cache
 * <p>该接口继承了JpaRepository和JpaSpecificationExecutor两个接口，提供基本的CRUD操作和规范查询能力。</p>
 *
 * @author zqr10159
 */
@Component
public interface GeneralConfigDao extends JpaRepository<GeneralConfig, Long>, JpaSpecificationExecutor<GeneralConfig> {
    
    /**
     * 通过类型查询
     *
     * @param type 类型
     * @return 返回查询到的配置信息
     */
    GeneralConfig findByType(String type);
}
