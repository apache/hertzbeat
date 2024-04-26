package org.apache.hertzbeat.collector.collect.redfish;

import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.common.constants.CollectorConstants;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.http.HttpStatus;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.util.EntityUtils;


/**
 * Redfish connect session
 */
public class RedfishConnectSession implements ConnectSession {

    private final Session session;

    private volatile boolean active = true;


    public RedfishConnectSession(Session session) {
        this.session = session;
    }

    @Override
    public boolean isOpen() {
        return this.active;
    }

    @Override
    public void close() throws Exception {
        this.active = false;
        String url = RedfishClient.REDFISH_SESSION_SERVICE + session.location();
        HttpDelete httpDelete = new HttpDelete(url);
        httpDelete.setHeader("X-Auth-Token", session.token());
        httpDelete.setHeader("Location", session.location());
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(httpDelete)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != HttpStatus.SC_OK) {
                throw new Exception("Http State code: " + statusCode);
            }
        } catch (Exception e) {
            throw new Exception("Redfish session close error:" + e.getMessage());
        } finally {
            httpDelete.abort();
        }
    }

    @Override
    public String getRedfishResource(String uri) throws Exception {
        String url = null;
        if (IpDomainUtil.isHasSchema(this.session.host())) {
            url = this.session.host() + ":" + this.session.port() + uri;
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(this.session.host());
            String baseUri = CollectorConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s", this.session.host(), this.session.port() + uri)
                    : String.format("%s:%s", this.session.host(), this.session.port() + uri);
            url = CollectorConstants.HTTP_HEADER + baseUri;
        }
        HttpGet httpGet = new HttpGet(url);
        httpGet.setHeader("X-Auth-Token", session.token());
        httpGet.setHeader("Location", session.location());
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(httpGet)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != HttpStatus.SC_OK) {
                throw new Exception("Http State code: " + statusCode);
            }
            String resp = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            return resp;
        } catch (Exception e) {
            throw new Exception("Redfish session get resource error:" + e.getMessage());
        } finally {
            httpGet.abort();
        }
    }
}
