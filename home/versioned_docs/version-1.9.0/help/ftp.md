---
id: ftp
title: Monitoring FTP
sidebar_label: FTP Monitor
keywords: [ open source monitoring tool, open source ftp server monitoring tool, monitoring ftp metrics ]
---

> Collect and monitor the general performance Metrics of FTP server.

**Protocol Use：FTP**

## Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Target Host         | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: ftp://).                                         |
| Monitoring name     | Identify the name of this monitoring, The name needs to be unique.                                                       |
| Port                | Port provided by FTP server ,default is 21.                                                                              |
| Direction           | Directory on the FTP server.                                                                                             |
| Timeout             | Timeout for connecting to FTP server.                                                                                    |
| Username            | Username for connecting to the FTP server, optional.                                                                     |
| Password            | Password for connecting to the FTP server, optional.                                                                     |
| SFTP                 | Use SFTP instead of FTP. SFTP requires a username and password.                                                           |
| Host key fingerprints | Trusted SFTP server SHA-256 fingerprints, one per line or separated by commas. Required unless verification is explicitly skipped. |
| Skip host key verification | **Dangerous option.** Use only for a controlled diagnostic; it does not authenticate the SFTP server.                         |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Bind Tags           | Used to classify and manage monitoring resources.                                                                        |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

## SFTP host key verification

HertzBeat accepts only the configured SFTP host keys. Obtain the server keys,
then verify their fingerprints through a trusted channel such as the server
console, configuration management, or an administrator. `ssh-keyscan` alone
does not authenticate a server.

```shell
ssh-keyscan -p 22 sftp.example.com > /tmp/sftp-host-keys
ssh-keygen -lf /tmp/sftp-host-keys -E sha256
```

Copy the verified `SHA256:...` values into **SFTP Host Key Fingerprints**. The
field accepts one value per line or comma-separated values.

For a planned host-key rotation, verify the new key first, add both the current
and new fingerprints, rotate the server key, and remove the old fingerprint
only after all HertzBeat collectors use the new key.

SFTP monitors and imported configurations must pin at least one fingerprint
unless the operator explicitly selects the dangerous skip-verification option.
HertzBeat does not enable that option automatically.

### Collection Metrics

#### Metrics Set：Basic

|  Metric name  | Metric unit |                 Metric help description                  |
|---------------|-------------|----------------------------------------------------------|
| Is Active     | none        | Check if the directory exists and has access permission. |
| Response Time | ms          | Response Time                                            |
