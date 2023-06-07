package org.dromara.hertzbeat.manager.service.impl;


import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.dromara.hertzbeat.manager.dao.UserAccountDao;
import org.dromara.hertzbeat.manager.pojo.dto.UserAccount;
import org.dromara.hertzbeat.manager.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * @author:Li Jinming
 * @Description: 用户账户管理服务
 * @date:2023-06-07
 */

@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class UserServiceImpl implements UserService {
    @Autowired
    UserAccountDao userAccountDao;

    @Override
    public Long addUser(UserAccount account) {
        long userId = SnowFlakeIdGenerator.generateId();
        account.setId(userId);
        userAccountDao.save(account);
        return userId;
    }

    @Override
    public void deleteUser(Long id) {
        userAccountDao.deleteAllByIdIn(Stream.of(id).collect(Collectors.toSet()));
    }

    @Override
    public void deleteUser(String userName) {
        userAccountDao.deleteUserAccountsByUserNameEquals(userName);
    }

    @Override
    public List<UserAccount> findUser(Long id) {
        return userAccountDao.findByIdIn(Stream.of(id).collect(Collectors.toSet()));
    }

    @Override
    public List<UserAccount> findUser(String userName) {
        return userAccountDao.findUserAccountsByUserNameEquals(userName);
    }
}
