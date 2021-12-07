package com.usthe.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 *
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
public class AppCount {
    /**监控类型**/
    private String app;
    /**监控数量**/
    private Long size;
}
