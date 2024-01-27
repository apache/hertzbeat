package org.dromara.hertzbeat.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Dashboard API
 * @author zqr10159
 */
@Tag(name = "Dashboard API | 仪表盘API")
@RestController
@RequestMapping(path = "/api/grafana/dashboard", produces = {APPLICATION_JSON_VALUE})
public class DashboardController {

}
