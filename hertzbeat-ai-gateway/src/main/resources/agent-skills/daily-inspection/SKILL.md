---
name: daily-inspection
description: Inspect HertzBeat monitor health and metrics storage, then produce a concise operations report. Use for daily checks, fleet health reviews, and monitoring summaries.
---
<!--
  Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements. See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0.
-->
# Daily Inspection

1. Use `monitor.query` with status statistics to establish the fleet-wide health baseline.
2. Use `metrics.warehouse_status` to verify that realtime and history storage are available.
3. If monitors are offline or unreachable, narrow the monitor query before drawing conclusions.
4. Query active alerts when the health baseline indicates a problem.
5. Distinguish observed facts from inferred causes.
6. Produce a concise Markdown report with overall health, urgent issues, evidence, and actionable recommendations.

Do not request credentials and do not invent monitor or alert state.
