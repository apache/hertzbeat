---
id: mysql_account_expiry
title: "Monitoring: MySQL Account Expiry"
sidebar_label: "MySQL Account Expiry"
keywords:
  - mysql account expiry
  - mysql password expiration
  - mysql security monitoring
---

> Monitor MySQL database account password expiration information.

### Collection Metric

#### Metric set：account_expiry

| Metric name           | Metric unit | Metric help description                              |
|-----------------------|-------------|------------------------------------------------------|
| user                  | none        | MySQL account username                               |
| host                  | none        | Host from which the account is allowed to connect    |
| password_lifetime     | day         | Password validity period in days                     |
| password_last_changed | timestamp   | Time when the password was last changed              |
| password_expired      | none        | Whether the account password is expired (true/false) |
| days_left             | day         | Remaining days before password expiration            |
