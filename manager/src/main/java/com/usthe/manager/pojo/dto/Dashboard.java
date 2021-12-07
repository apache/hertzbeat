package com.usthe.manager.pojo.dto;

import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 大屏仪表盘统计信息
 *
 *
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "大屏仪表盘统计信息")
public class Dashboard {

    List<AppCount> apps;

}
