package com.usthe.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author tom
 * @date 2021/12/7 16:32
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
public class AppCount {

    public AppCount(String app, byte status, Long size) {
        this.app = app;
        this.status = status;
        this.size = size;
    }

    /**
     * 监控大类别
     */
    private String category;
    /**
     * 监控类型
     */
    private String app;
    /**
     * 监控状态
     */
    private transient byte status;
    /**
     * 监控数量
     */
    private long size;
    /**
     * 监控状态可用的数量
     */
    private long availableSize;
    /**
     * 监控状态未管理的数量
     */
    private long unManageSize;
    /**
     * 监控状态不可用的数量
     */
    private long unAvailableSize;
    /**
     * 监控状态不可达的数量
     */
    private long unReachableSize;
}
