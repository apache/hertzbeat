---
id: fullsite  
title: Monitoring Full site      
sidebar_label: Full site Monitor   
keywords: [open source monitoring tool, open source website monitoring tool, monitoring sitemap metrics]
---

> Available or not to monitor all pages of the website.
> A website often has multiple pages provided by different services. We monitor the full site by collecting the SiteMap exposed by the website.
> Note⚠️ This monitoring requires your website to support SiteMap. We support SiteMap in XML and TXT formats.

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Ports provided by website, http generally defaults to 80 and https generally defaults to 443                                                                              |
| SiteMap             | Relative path of website SiteMap address, eg：/sitemap.xml                                                                                                                 |
| Enable HTTPS        | Whether to access the website through HTTPS. Note⚠️When HTTPS is enabled, the default corresponding port needs to be changed to 443                                       |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metric

#### Metric set：summary

| Metric name  | Metric unit |               Metric help description                |
|--------------|-------------|------------------------------------------------------|
| url          | none        | URL path of web page                                 |
| statusCode   | none        | Response HTTP status code for requesting the website |
| responseTime | ms          | Website response time                                |
| errorMsg     | none        | Error message feedback after requesting the website  |
