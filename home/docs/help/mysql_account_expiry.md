# MySQL Account Expiry

HertzBeat supports monitoring of MySQL database account password expiration,
allowing administrators to detect expired or soon-to-expire accounts and
configure alerts.

---

## Metric: `account_expiry`

This metric collects password expiration information for all MySQL users.

### Fields

| Field | Description |
|------|-------------|
| user | MySQL username |
| host | Allowed host |
| password_lifetime | Password validity in days |
| password_last_changed | When the password was last changed |
| password_expired | Whether the account is expired |
| days_left | Remaining days before expiration |

---

## SQL

```sql
SELECT
  user,
  host,
  password_lifetime,
  password_last_changed,
  password_expired,
  IF(password_lifetime IS NULL,
     NULL,
     password_lifetime - DATEDIFF(NOW(), password_last_changed)
  ) AS days_left
FROM mysql.user;
```
This enables alerts on:

- Expired accounts
- Accounts expiring soon
- Security risks from stale credentials
