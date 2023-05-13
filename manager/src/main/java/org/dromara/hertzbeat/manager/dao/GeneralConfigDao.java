package org.dromara.hertzbeat.manager.dao;

import org.dromara.hertzbeat.common.entity.manager.GeneralConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Component;


/**
 * @description: 消息通知服务端配置Dao
        * @author zqr10159
        * @date 2023/5/9 22:39
        * @version 1.0
        */
@Component
public interface GeneralConfigDao extends JpaRepository<GeneralConfig, Long>, JpaSpecificationExecutor<GeneralConfig> {

    /*
     * @description: 通过类型删除
     * @param: Byte type
     * @return: int
     * @author zqr
     * @date: 2023/5/9 23:02
     */
    int deleteByType(Byte type);
    /*
     * @description: 通过类型查询
     * @param: Byte type
     * @return: Config
     * @author zqr
     * @date: 2023/5/9 23:02
     */
    GeneralConfig findByType(Byte type);
}
