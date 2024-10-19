package org.apache.hertzbeat.templatehub.sureness.provider;

import com.usthe.sureness.matcher.PathTreeProvider;
import com.usthe.sureness.util.SurenessCommonUtil;
import org.apache.hertzbeat.templatehub.service.ResourceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * ths provider provides path resources
 * load sureness config resource form database
 * @author tomsun28
 * @date 16:00 2019-08-04
 */
@Component
public class DatabasePathTreeProvider implements PathTreeProvider {

    @Autowired
    private ResourceService resourceService;

    @Override
    public Set<String> providePathData() {
        // 从数据库中读取出path信息，取出所有状态为1，即正常的path信息
        Set<String> pathSet = SurenessCommonUtil.attachContextPath(getContextPath(), resourceService.getAllEnableResourcePath());
        return pathSet;

    }

    @Override
    public Set<String> provideExcludedResource() {
        // 从数据库中读取出path信息，取出所有状态为9，即禁用的path信息
        Set<String> exlResourceSet = SurenessCommonUtil.attachContextPath(getContextPath(), resourceService.getAllDisableResourcePath());
        return exlResourceSet;
    }

}
