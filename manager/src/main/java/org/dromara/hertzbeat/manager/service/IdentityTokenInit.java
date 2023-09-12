package org.dromara.hertzbeat.manager.service;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.cache.CacheFactory;
import org.dromara.hertzbeat.common.cache.ICacheService;
import org.dromara.hertzbeat.common.entity.manager.IdentityToken;
import org.dromara.hertzbeat.manager.dao.IdentityTokenDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * identity token database record init cache
 * @author tom
 *
 */
@Service
@Order(value = 2)
@Slf4j
public class IdentityTokenInit implements CommandLineRunner {

	@Autowired
	private IdentityTokenDao identityTokenDao;

	@Override
	public void run(String... args) throws Exception {
		List<IdentityToken> tokenList = identityTokenDao.findAll();
		ICacheService<String, Object> cacheService = CacheFactory.getIdentityTokenCache();
		long current = System.currentTimeMillis();
		for (IdentityToken token : tokenList) {
			if (token.getExpireTime() != null && token.getExpireTime() <= current) {
				identityTokenDao.delete(token);
			} else {
				cacheService.put(token.getToken(), token);
			}
		}
	}
}
