package com.usthe.manager.service.impl;

import com.usthe.manager.dao.NoticeReceiverDao;
import com.usthe.manager.dao.NoticeRuleDao;
import com.usthe.manager.pojo.entity.NoticeReceiver;
import com.usthe.manager.pojo.entity.NoticeRule;
import com.usthe.manager.service.NoticeConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 消息通知配置实现
 *
 *
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class NoticeConfigServiceImpl implements NoticeConfigService {

    @Autowired
    private NoticeReceiverDao noticeReceiverDao;

    @Autowired
    private NoticeRuleDao noticeRuleDao;

    @Override
    public List<NoticeReceiver> getNoticeReceivers(Specification<NoticeReceiver> specification) {
        return noticeReceiverDao.findAll(specification);
    }

    @Override
    public List<NoticeRule> getNoticeRules(Specification<NoticeRule> specification) {
        return noticeRuleDao.findAll(specification);
    }

    @Override
    public void addReceiver(NoticeReceiver noticeReceiver) {
        noticeReceiverDao.save(noticeReceiver);
    }

    @Override
    public void editReceiver(NoticeReceiver noticeReceiver) {
        noticeReceiverDao.save(noticeReceiver);
    }

    @Override
    public void deleteReceiver(Long receiverId) {
        noticeReceiverDao.deleteById(receiverId);
    }

    @Override
    public void addNoticeRule(NoticeRule noticeRule) {
        noticeRuleDao.save(noticeRule);
    }

    @Override
    public void editNoticeRule(NoticeRule noticeRule) {
        noticeRuleDao.save(noticeRule);
    }

    @Override
    public void deleteNoticeRule(Long ruleId) {
        noticeRuleDao.deleteById(ruleId);
    }
}
