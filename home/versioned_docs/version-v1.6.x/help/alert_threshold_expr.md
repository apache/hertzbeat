---
id: alert_threshold_expr  
title: Threshold Trigger Expression  
sidebar_label: Threshold Trigger Expression
---

> When configuring threshold alerts, it is necessary to set up threshold trigger expressions. The system calculates whether to trigger an alert based on the expression and the monitored metric values. Here, we provide a detailed explanation of expression usage.

#### Supported Operators in Expressions

| Operator (Visual Configuration) | Operator (Expression Configuration) |    Supported Types    |                Description                 |
|---------------------------------|-------------------------------------|-----------------------|--------------------------------------------|
| Equals                          | equals(str1,str2)                   | String                | Check if strings are equal                 |
| Not Equals                      | !equals(str1,str2)                  | String                | Check if strings are not equal             |
| Contains                        | contains(str1,str2)                 | String                | Check if string contains                   |
| Not Contains                    | !contains(str1,str2)                | String                | Check if string does not contain           |
| Matches                         | matches(str1,str2)                  | String                | Check if string matches regex              |
| Not Matches                     | !matches(str1,str2)                 | String                | Check if string does not match regex       |
| Exists                          | exists(obj)                         | String, Numeric, Time | Check if value exists                      |
| Not Exists                      | !exists(obj)                        | String, Numeric, Time | Check if value does not exist              |
| Greater than                    | obj1 > obj2                         | Numeric, Time         | Check if value is greater than             |
| Less than                       | obj1 < obj2                         | Numeric, Time         | Check if value is less than                |
| Greater than or Equal to        | obj1 >= obj2                        | Numeric, Time         | Check if value is greater than or equal to |
| Less than or Equal to           | obj1 <= obj2                        | Numeric, Time         | Check if value is less than or equal to    |
| Not Equal to                    | obj1 != obj2                        | Numeric, Time         | Check if values are not equal              |
| Equal to                        | obj1 == obj2                        | Numeric, Time         | Check if values are equal                  |

#### Expression Function Library List

|          Supported Function Library          |                                        Description                                         |
|----------------------------------------------|--------------------------------------------------------------------------------------------|
| condition ? trueExpression : falseExpression | Ternary operator                                                                           |
| toDouble(str)                                | Convert string to Double type                                                              |
| toBoolean(str)                               | Convert string to Boolean type                                                             |
| toInteger(str)                               | Convert string to Integer type                                                             |
| array[n]                                     | Retrieve the nth element of an array                                                       |
| *                                            | Multiplication                                                                             |
| /                                            | Division                                                                                   |
| %                                            | Modulo                                                                                     |
| ( and )                                      | Parentheses for controlling the order of operations in logical or mathematical expressions |
| +                                            | Addition                                                                                   |
| -                                            | Subtraction                                                                                |
| &&                                           | Logical AND operator                                                                       |
| \|\|                                         | Logical OR operator                                                                        |

#### Supported Environment Variables

> Environment variables refer to variables supported by metric values, used in expressions. During threshold calculation and judgment, these variables will be replaced with actual values.

Non-fixed Environment Variables: These variables change dynamically based on the selected monitoring metric. For example, if we choose **response time metric for website monitoring**, the environment variable would be `responseTime - this represents response time variable`. If we want to set an alert trigger for **response time greater than 400 for website monitoring**, the expression would be `responseTime>400`.

Fixed Environment Variables (Less commonly used): `instance: instance value`
This variable is mainly used for calculations involving multiple instances. For instance, if we collect usage metrics for C drive and D drive (`usage` being a non-fixed environment variable), and we only want to set an alert for **usage greater than 80 for the C drive**, the expression would be `equals(instance,"c")&&usage>80`.

#### Expression Configuration Examples

1. Website Monitoring -> Alert when response time is greater than or equal to 400ms
   `responseTime>=400`
2. API Monitoring -> Alert when response time is greater than 3000ms
   `responseTime>3000`
3. Overall Monitoring -> Alert when response time for URL (instance) path '<https://baidu.com>' is greater than 200ms
   `equals(instance,"https://baidu.com")&&responseTime>200`
4. MYSQL Monitoring -> Alert when 'threads_running' metric under 'status' exceeds 7
   `threads_running>7`

If you encounter any issues, feel free to discuss and provide feedback through our community group or ISSUE tracker!
