package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.entity.manager.NoticeRule;
import com.usthe.manager.service.NoticeConfigService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.persistence.criteria.Predicate;
import javax.validation.Valid;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 消息通知配置API
 * @author tom
 * @date 2021/12/16 16:18
 */
@Api(tags = "消息通知配置API")
@RestController()
@RequestMapping(value = "/notice", produces = {APPLICATION_JSON_VALUE})
public class NoticeConfigController {

    @Autowired
    private NoticeConfigService noticeConfigService;

    @PostMapping(path = "/receiver")
    @ApiOperation(value = "新增接收人", notes = "新增一个接收人")
    public ResponseEntity<Message<Void>> addNewNoticeReceiver(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        noticeConfigService.addReceiver(noticeReceiver);
        return ResponseEntity.ok(new Message<>("Add success"));
    }

    @PutMapping(path = "/receiver")
    @ApiOperation(value = "修改接收人", notes = "修改已存在的接收人信息")
    public ResponseEntity<Message<Void>> editNoticeReceiver(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        noticeConfigService.editReceiver(noticeReceiver);
        return ResponseEntity.ok(new Message<>("Edit success"));
    }

    @DeleteMapping(path = "/receiver/{id}")
    @ApiOperation(value = "删除指定接收人", notes = "删除已存在的接收人信息")
    public ResponseEntity<Message<Void>> deleteNoticeReceiver(
            @ApiParam(value = "接收人ID", example = "6565463543") @PathVariable("id") final Long receiverId) {
        // 不存在或删除成功都返回成功
        noticeConfigService.deleteReceiver(receiverId);
        return ResponseEntity.ok(new Message<>("Delete success"));
    }

    @GetMapping(path = "/receivers")
    @ApiOperation(value = "查询消息通知接收人", notes = "根据查询过滤项获取消息通知接收人列表")
    public ResponseEntity<Message<List<NoticeReceiver>>> getReceivers(
            @ApiParam(value = "接收人名称，模糊查询", example = "tom") @RequestParam(required = false) final String name) {

        Specification<NoticeReceiver> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (name != null && !"".equals(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        List<NoticeReceiver> receivers = noticeConfigService.getNoticeReceivers(specification);
        Message<List<NoticeReceiver>> message = new Message<>(receivers);
        return ResponseEntity.ok(message);
    }


    @PostMapping(path = "/rule")
    @ApiOperation(value = "新增通知策略", notes = "新增一个通知策略")
    public ResponseEntity<Message<Void>> addNewNoticeRule(@Valid @RequestBody NoticeRule noticeRule) {
        noticeConfigService.addNoticeRule(noticeRule);
        return ResponseEntity.ok(new Message<>("Add success"));
    }

    @PutMapping(path = "/rule")
    @ApiOperation(value = "修改通知策略", notes = "修改已存在的通知策略信息")
    public ResponseEntity<Message<Void>> editNoticeRule(@Valid @RequestBody NoticeRule noticeRule) {
        noticeConfigService.editNoticeRule(noticeRule);
        return ResponseEntity.ok(new Message<>("Edit success"));
    }

    @DeleteMapping(path = "/rule/{id}")
    @ApiOperation(value = "删除指定通知策略", notes = "删除已存在的通知策略信息")
    public ResponseEntity<Message<Void>> deleteNoticeRule(
            @ApiParam(value = "通知策略ID", example = "6565463543") @PathVariable("id") final Long ruleId) {
        // 不存在或删除成功都返回成功
        noticeConfigService.deleteNoticeRule(ruleId);
        return ResponseEntity.ok(new Message<>("Delete success"));
    }

    @GetMapping(path = "/rules")
    @ApiOperation(value = "查询消息通知策略", notes = "根据查询过滤项获取消息通知策略列表")
    public ResponseEntity<Message<List<NoticeRule>>> getRules(
            @ApiParam(value = "接收人名称，模糊查询", example = "rule1") @RequestParam(required = false) final String name) {

        Specification<NoticeRule> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (name != null && !"".equals(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };

        List<NoticeRule> receiverPage = noticeConfigService.getNoticeRules(specification);
        Message<List<NoticeRule>> message = new Message<>(receiverPage);
        return ResponseEntity.ok(message);
    }

}
