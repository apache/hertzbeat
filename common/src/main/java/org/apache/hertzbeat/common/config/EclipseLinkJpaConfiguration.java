package org.apache.hertzbeat.common.config;

import org.eclipse.persistence.config.PersistenceUnitProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.orm.jpa.JpaBaseConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.JpaProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.vendor.AbstractJpaVendorAdapter;
import org.springframework.orm.jpa.vendor.EclipseLinkJpaVendorAdapter;
import org.springframework.transaction.jta.JtaTransactionManager;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * jpa eclipselink impl config
 */
@Configuration
public class EclipseLinkJpaConfiguration extends JpaBaseConfiguration {

    protected EclipseLinkJpaConfiguration(DataSource dataSource, JpaProperties properties, 
                                          ObjectProvider<JtaTransactionManager> jtaTransactionManager) {
        super(dataSource, properties, jtaTransactionManager);
    }

    @Override
    protected AbstractJpaVendorAdapter createJpaVendorAdapter() {
        return new EclipseLinkJpaVendorAdapter();
    }

    @Override
    protected Map<String, Object> getVendorProperties() {
        HashMap<String, Object> map = new HashMap<>(8);
        map.put(PersistenceUnitProperties.DDL_GENERATION, "create-or-extend-tables");
        map.put(PersistenceUnitProperties.SESSION_CUSTOMIZER, "org.apache.hertzbeat.common.config.EclipseLinkCustomizer");
        map.put(PersistenceUnitProperties.LOGGING_LEVEL,"WARNING");
        map.put(PersistenceUnitProperties.ALLOW_NATIVE_SQL_QUERIES, "true");
        return map;
    }
}
