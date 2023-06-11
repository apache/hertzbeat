package org.dromara.hertzbeat.manager.service.impl;


import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.provider.ducument.DocumentAccountProvider;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.manager.dao.UserTokenDao;
import org.dromara.hertzbeat.manager.pojo.dto.UserToken;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.dromara.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.dromara.hertzbeat.manager.dao.UserAccountDao;
import org.dromara.hertzbeat.manager.pojo.dto.UserAccount;
import org.dromara.hertzbeat.manager.service.UserService;
import org.dromara.hertzbeat.manager.support.JwtTokenHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
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
    SurenessAccountProvider provider = new DocumentAccountProvider();
    @Autowired
    UserAccountDao userAccountDao;

    @Autowired
    UserTokenDao userTokenDao;

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
        userAccountDao.deleteUserAccountsByIdentifierEquals(userName);
    }

    @Override
    public UserAccount findUser(Long id) {
        List<UserAccount> accountList = userAccountDao.findByIdIn(Stream.of(id).collect(Collectors.toSet()));
        if (CommonUtil.isNullOrEmpty(accountList)) {
            return null;
        }
        return accountList.get(0);
    }


    @Override
    public UserAccount findUser(String userName) {
        //todo: by now we also use sureness default provider ,when complete refactor the auth manage feature, will use our own db
        SurenessAccount account = provider.loadAccount(userName);
        if (account == null) {

            List<UserAccount> accountList = userAccountDao.findUserAccountsByIdentifierEquals(userName);
            if (CommonUtil.isNullOrEmpty(accountList)) {
                return null;
            }
            return accountList.get(0);
        }
        UserAccount userAccount = UserAccount.builder()
                .identifier(account.getAppId())
                .salt(account.getSalt())
                .ownRoles(account.getOwnRoles())
                .password(account.getPassword())
                .disabledAccount(account.isDisabledAccount())
                .excessiveAttempts(account.isExcessiveAttempts())
                .id(100000L)
                .build();
        return userAccount;
    }


    @Override
    public void deleteUserTokens(Set<Long> ids) {
        userTokenDao.deleteUserTokensByIdIn(ids);
    }


    @Override
    public Map<String, String> issueAndSaveToken(UserAccount account, Long tokenExpireTime) {
        Map<String, String> resp = JwtTokenHelper.issueJwtToken(account, account.getIdentifier(), tokenExpireTime);
        UserToken newToken = UserToken.builder().token(resp.get("token")).accountIdentifier(account.getAppId()).build();
        userTokenDao.save(newToken);
        resp.put("id", newToken.getId().toString());
        return resp;
    }

    @Override
    public Map<String, String> formToken(UserAccount account, Long tokenExpireTime) {
        return JwtTokenHelper.issueJwtToken(account, account.getIdentifier(), tokenExpireTime);
    }

    @Override
    public List<UserToken> findTokens(String identifier) {
        return userTokenDao.findUserTokenByAccountIdentifier(identifier);
    }
}
