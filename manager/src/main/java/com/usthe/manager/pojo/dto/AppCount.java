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
    /**监控类型**/
    private String app;
    /**监控数量**/
    private Long size;
}
