package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.manager.pojo.entity.Monitor;
import com.usthe.manager.service.MonitorService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.Predicate;

import java.util.HashSet;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 监控管理批量API
 *
 *
 */
@Api(tags = "监控列表API")
@RestController
@RequestMapping(path = "/monitors", produces = {APPLICATION_JSON_VALUE})
public class MonitorsController {

    @Autowired
    private MonitorService monitorService;

    @GetMapping
    @ApiOperation(value = "查询监控列表", notes = "根据查询过滤项获取监控信息列表")
    public ResponseEntity<Message<Page<Monitor>>> getMonitors(
            @ApiParam(value = "监控ID", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @ApiParam(value = "监控类型", example = "linux") @RequestParam(required = false) String app,
            @ApiParam(value = "监控名称，模糊查询", example = "linux-127.0.0.1") @RequestParam(required = false) String name,
            @ApiParam(value = "监控Host，模糊查询", example = "127.0.0.1") @RequestParam(required = false) String host,
            @ApiParam(value = "排序字段，默认id", example = "name") @RequestParam(defaultValue = "id") String sort,
            @ApiParam(value = "排序方式，asc:升序，desc:降序", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @ApiParam(value = "列表当前分页", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @ApiParam(value = "列表分页数量", example = "8") @RequestParam(defaultValue = "8") int pageSize) {

        Specification<Monitor> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (ids != null && !ids.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate= criteriaBuilder.in(root.get("id"));
                for (long id : ids) {
                    inPredicate.value(id);
                }
                predicate = criteriaBuilder.and(inPredicate);
            }
            if (app != null && !"".equals(app)) {
                Predicate predicateApp = criteriaBuilder.equal(root.get("app"), app);
                predicate = criteriaBuilder.and(predicateApp);
            }
            if (name != null && !"".equals(name) && host != null && !"".equals(host)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                Predicate predicateHost = criteriaBuilder.like(root.get("host"), "%" + host + "%");
                predicate = criteriaBuilder.or(predicateName, predicateHost);
            } else {
                if (host != null && !"".equals(host)) {
                    Predicate predicateHost = criteriaBuilder.like(root.get("host"), "%" + host + "%");
                    predicate = criteriaBuilder.and(predicateHost);
                }
                if (name != null && !"".equals(name)) {
                    Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                    predicate = criteriaBuilder.and(predicateName);
                }
            }
            return predicate;
        };
        // 分页是必须的
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<Monitor> monitorPage = monitorService.getMonitors(specification, pageRequest);
        Message<Page<Monitor>> message = new Message<>(monitorPage);
        return ResponseEntity.ok(message);
    }

    @GetMapping(path = "/{app}")
    @ApiOperation(value = "查询指定监控类型的监控列表", notes = "根据查询过滤指定监控类型的所有获取监控信息列表")
    public ResponseEntity<Message<List<Monitor>>> getAppMonitors(
            @ApiParam(value = "监控类型", example = "linux") @PathVariable(required = false) String app) {
        List<Monitor> monitors = monitorService.getAppMonitors(app);
        Message<List<Monitor>> message = new Message<>(monitors);
        return ResponseEntity.ok(message);
    }

    @DeleteMapping
    @ApiOperation(value = "批量删除监控", notes = "根据监控ID列表批量删除监控项")
    public ResponseEntity<Message<Void>> deleteMonitors(
            @ApiParam(value = "监控IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.deleteMonitors(new HashSet<>(ids));
        }
        Message<Void> message = new Message<>();
        return ResponseEntity.ok(message);
    }

    @DeleteMapping("manage")
    @ApiOperation(value = "批量取消纳管监控", notes = "根据监控ID列表批量取消纳管监控项")
    public ResponseEntity<Message<Void>> cancelManageMonitors(
            @ApiParam(value = "监控IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.cancelManageMonitors(new HashSet<>(ids));
        }
        Message<Void> message = new Message<>();
        return ResponseEntity.ok(message);
    }

    @GetMapping("manage")
    @ApiOperation(value = "批量启动纳管监控", notes = "根据监控ID列表批量启动纳管监控项")
    public ResponseEntity<Message<Void>> enableManageMonitors(
            @ApiParam(value = "监控IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.enableManageMonitors(new HashSet<>(ids));
        }
        Message<Void> message = new Message<>();
        return ResponseEntity.ok(message);
    }

}
