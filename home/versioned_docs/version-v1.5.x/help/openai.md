---
id: openai
title: Monitoring OpenAI Account Status
sidebar_label: OpenAI Account Status
keywords: [open source monitoring system, open source network monitoring, OpenAI account monitoring]
---

### Preparation

#### Obtain Session Key

> 1. Open Chrome browser's network request interface
>    `Mac: cmd + option + i`
>    `Windows: ctrl + shift + i`
> 2. Visit <https://platform.openai.com/usage>
> 3. Find the request to <https://api.openai.com/dashboard/billing/usage>
> 4. Find the Authorization field in the request headers, and copy the content after `Bearer`. For example: `sess-123456`

### Notes

> 1. Please ensure that HertzBeat has external network access capability. If unsure, you can try detecting by creating HTTP API monitoring for openai.com in HertzBeat.
> 2. The monitoring period should be at least greater than 120 seconds to avoid sending requests too frequently, resulting in return status code 429 (Too Many Requests).

### Configuration Parameters

| Parameter Name    |                                     Parameter Description                                      |
|:------------------|------------------------------------------------------------------------------------------------|
| Monitoring Host   | Fill in api.openai.com here.                                                                   |
| Task Name         | Identify the name of this monitoring, ensuring uniqueness.                                     |
| Session Key       | The session key obtained in the preparation step.                                              |
| Collector         | Configure which collector to use for scheduling collection for this monitoring.                |
| Monitoring Period | Interval time for periodic data collection, in seconds, with a minimum interval of 30 seconds. |
| Bound Tags        | Tags for managing classification of monitoring resources.                                      |
| Description       | Additional identification and description for this monitoring, users can leave remarks here.   |

### Collection Metrics

#### Metric Set: Credit Grants

|     Metric Name      | Metric Unit |          Metric Description          |
|----------------------|-------------|--------------------------------------|
| Total Granted        | USD ($)     | Total granted credit limit           |
| Total Used           | USD ($)     | Total used credit limit              |
| Total Available      | USD ($)     | Total available credit limit         |
| Total Paid Available | USD ($)     | Total payable available credit limit |

#### Metric Set: Model Cost

| Metric Name | Metric Unit |   Metric Description   |
|-------------|-------------|------------------------|
| Model Name  | None        | Name of the model      |
| Cost        | USD ($)     | Expenses for the model |

#### Metric Set: Billing Subscription

|       Metric Name        | Metric Unit |           Metric Description            |
|--------------------------|-------------|-----------------------------------------|
| Has Payment Method       | None        | Whether payment method is available     |
| Canceled                 | None        | Whether subscription is cancelled       |
| Canceled At              | None        | Time of subscription cancellation       |
| Delinquent               | None        | Whether subscription is overdue         |
| Soft Limit               | Times       | Maximum usage limit in a certain period |
| Hard Limit               | Times       | Maximum usage limit                     |
| System Hard Limit        | Times       | System hard limit usage                 |
| Soft Limit USD           | USD ($)     | Soft limit charge                       |
| Hard Limit USD           | USD ($)     | Hard limit charge                       |
| System Hard Limit USD    | USD ($)     | System hard limit charge                |
| Plan                     | None        | Subscription plan                       |
| Primary                  | None        | Whether it's a primary subscription     |
| Billing Mechanism        | None        | Settlement mechanism                    |
| Is Arrears Eligible      | None        | Whether eligible for overdue            |
| Max Balance              | USD ($)     | Maximum balance                         |
| Auto Recharge Eligible   | None        | Whether eligible for auto recharge      |
| Auto Recharge Enabled    | None        | Whether auto recharge is enabled        |
| Auto Recharge Threshold  | USD ($)     | Auto recharge threshold                 |
| Auto Recharge To Balance | USD ($)     | Auto recharge amount                    |
| Trust Tier               | None        | Credit level                            |
| Account Name             | None        | Account name                            |
| Po Number                | None        | Purchase order                          |
| Billing Email            | None        | Billing email                           |
| Tax IDs                  | None        | Tax IDs                                 |
| Billing Address          | None        | Billing address                         |
| Business Address         | None        | Business address                        |
