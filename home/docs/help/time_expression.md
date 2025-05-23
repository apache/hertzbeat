---
id: time_expression
title: Time Expression
sidebar_label: Time Expression
keywords: [ dynamic time, time expressions ]
---

### Introduction

HertzBeat supports using expressions to calculate relative time during monitoring collection, allowing for more flexible time definitions in monitoring templates.

### Syntax

```shell
${FORMATTER [{ + | - }<DURATION> <TIME_UNIT>]}
```

- `FORMATTER`: Determines the format of the expression's result
- `DURATION`: Size of the time period, a positive integer
- `TIME_UNIT`: Unit of the time period

### Supported Formatting Types

> Example outputs are based on the current time being `2022-04-24 02:40:00.123`

|     Name     |           Description            |       Example       |
|--------------|----------------------------------|---------------------|
| @now         | Formats as `yyyy-MM-dd HH:mm:ss` | 2022-04-24 02:40:00 |
| @date        | Formats as `yyyy-MM-dd`          | 2022-04-24          |
| @timestamp10 | Returns 10-digit timestamp       | 1650768000          |
| @timestamp   | Returns 13-digit timestamp       | 1650768000000       |
| @time        | Formats as `HH:mm:ss`            | 02:40:00            |
| @year        | Formats as `yyyy`                | 2022                |
| @month       | Formats as `MM`                  | 04                  |
| @day         | Formats as `dd`                  | 24                  |
| @hour        | Formats as `HH`                  | 02                  |
| @minute      | Formats as `mm`                  | 40                  |
| @millisecond | Formats as `SSS`                 | 123                 |
| @second      | Formats as `ss`                  | 00                  |

### Supported Time Units

| Name | Description |
|------|-------------|
| y    | Year        |
| M    | Month       |
| d    | Day         |
| H    | Hour        |
| m    | Minute      |
| s    | Second      |
| w    | Week        |

#### Where to Use

- Request parameters for HTTP protocol monitoring types
- Request Body for HTTP protocol monitoring types

#### Usage Examples

1. Simple expression
   - `${@now}` gets the current time and formats it as `yyyy-MM-dd HH:mm:ss`
   - `${@time+1H}` calculates the time one hour from now and formats it as `HH:mm:ss`
   - `${@time+1H+15m+30s}` calculates the time one hour, 15 minutes, and 30 seconds from now and formats it as `HH:mm:ss`
2. Complex expression template (if the built-in formatter does not meet your needs, you can combine multiple expressions)
   - `${@year}年${@month}月${@day}日` returns the current date formatted as yyyy年MM月dd日
