---
id: alert_serverchan
title: ServerChan notifications
sidebar_label: ServerChan
---

## Response compatibility

Starting with 1.9.1, a ServerChan notification is successful only when the endpoint returns HTTP 200 and a JSON response containing the numeric field `code` with value `0`, for example:

```json
{"code": 0, "message": ""}
```

A nonzero code, missing/null code, empty or malformed response, HTTP error or network failure is reported as a notification failure. HTTP 200 alone, or `errcode: 0` without `code: 0`, is not success. A configured compatible endpoint must implement this same response contract; this does not expand the existing endpoint policy.
