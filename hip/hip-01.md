

# HIP-01: Refactoring AbstractCollect


# Motivation

In the current situation, almost every collector needs to execute the preCheck method (with inconsistent names), and there are also redundant `try-catch` statements;

I suggest providing another `preCheck` method for `AbstractCollect` to separate the validate logic from the collector's logic, which would make the code structure clearer and also facilitate the writing of unit tests.

# Goals

## In Scope

Add a method `preCheck` to `AbstractCollect`.




# Detailed Design

## Design & Implementation Details

Add a method `preCheck` to the `org.apache.hertzbeat.collector.collect.AbstractCollect` class:

```java
public abstract class AbstractCollect {

    /**
     * @param metrics metric configuration
     * @throws Exception when validation failed
     */
    public abstract void preCheck(Metrics metrics) throws Exception;
}
```

Before calling the method `org.apache.hertzbeat.collector.collect.AbstractCollect#collect`, call the `preCheck` method and catch the exception.

Refactoring all `AbstractCollect` to implement the `preCheck` method.

Supplement the relevant unit tests.





# Links

<!--
Updated afterwards
-->
* Mailing List discussion thread: https://lists.apache.org/thread/cvvo7xg35fxq7kml5ggdrcdygrx6yvyj
* Mailing List voting thread: https://lists.apache.org/thread/1s7dhrb27qfdx1gsh29dvmo8frjbt619
