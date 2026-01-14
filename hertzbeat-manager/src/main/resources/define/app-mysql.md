# MySQL Account Expiry

HertzBeat supports monitoring of MySQL database account password expiration,
allowing administrators to detect expired or soon-to-expire accounts and
configure alerts.

---

## Metric: account_expiry

This metric collects password expiration information for all MySQL users.

### Fields

| Field | Description |
|------|-------------|
| user | MySQL user name |
| host | Host from which the user can connect |
| days_left | Remaining days before password expires. NULL means no expiry policy |
| password_expired | Whether the password is already expired (Y or N) |

---

## SQL

The metric is collected using:

```sql
SELECT
  user,
  host,
  password_expired,
  IF(password_lifetime IS NULL,
     NULL,
     password_lifetime - DATEDIFF(NOW(), password_last_changed)
  ) AS days_left
FROM mysql.user;
