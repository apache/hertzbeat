package org.apache.hertzbeat.grafana.service;

import static org.apache.hertzbeat.grafana.common.CommonConstants.*;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.grafana.config.GrafanaConfiguration;
import org.apache.hertzbeat.warehouse.store.history.vm.VictoriaMetricsProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Service for managing Grafana datasources.
 */
@Service
@Slf4j
public class DatasourceService {

    private String grafanaUrl;
    private String grafanaUsername;
    private String grafanaPassword;
    private String victoriaMetricsUrl;

    private final GrafanaConfiguration grafanaConfiguration;
    private final VictoriaMetricsProperties warehouseProperties;
    private final RestTemplate restTemplate;

    @Autowired
    public DatasourceService(
            GrafanaConfiguration grafanaConfiguration,
            VictoriaMetricsProperties warehouseProperties,
            RestTemplate restTemplate
    ) {
        this.grafanaConfiguration = grafanaConfiguration;
        this.warehouseProperties = warehouseProperties;
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        this.grafanaUrl = grafanaConfiguration.getUrl().replace("http://", "").replace("https://", "");
        this.grafanaUsername = grafanaConfiguration.getUsername();
        this.grafanaPassword = grafanaConfiguration.getPassword();
        this.victoriaMetricsUrl = warehouseProperties.url();
    }

    /**
     * Creates a new datasource in Grafana.
     *
     * @return ResponseEntity containing the response from Grafana
     */
    public ResponseEntity<String> createDatasource() {
        String url = String.format(CREATE_DATASOURCE_API, grafanaUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(grafanaUsername, grafanaPassword);

        String body = String.format(
                "{\"name\":\"%s\",\"type\":\"%s\",\"access\":\"%s\",\"url\":\"%s\",\"basicAuth\":%s}",
                DATASOURCE_NAME, DATASOURCE_TYPE, DATASOURCE_ACCESS, victoriaMetricsUrl, false
        );

        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Create datasource success");
            }
            return response;
        } catch (Exception ex) {
            log.error("Create datasource error", ex);
            throw new RuntimeException("Create datasource error", ex);
        }
    }

    /**
     * Deletes a datasource in Grafana.
     *
     * @return ResponseEntity containing the response from Grafana
     */
    public ResponseEntity<String> deleteDatasource() {
        String url = String.format(DELETE_DATASOURCE_API, grafanaUrl, DATASOURCE_NAME);

        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(grafanaUsername, grafanaPassword);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Delete datasource success");
            }
            return response;
        } catch (Exception ex) {
            log.error("Delete datasource error", ex);
            throw new RuntimeException("Delete datasource error", ex);
        }
    }
}
