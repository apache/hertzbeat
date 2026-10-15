#!/usr/bin/env bash
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

set -euo pipefail

RECOMMENDATION_CONTAINER="${RECOMMENDATION_CONTAINER:-recommendation}"
RECOMMENDATION_REQUEST_COUNT="${RECOMMENDATION_REQUEST_COUNT:-6}"
RECOMMENDATION_USER_ID="${RECOMMENDATION_USER_ID:-codex}"
RECOMMENDATION_PRODUCT_IDS="${RECOMMENDATION_PRODUCT_IDS:-66VCHSJNUP}"
RECOMMENDATION_REQUEST_DELAY_SECONDS="${RECOMMENDATION_REQUEST_DELAY_SECONDS:-0.35}"

docker exec -i "${RECOMMENDATION_CONTAINER}" /venv/bin/python - <<PY
import os
import time
import grpc
import demo_pb2
import demo_pb2_grpc

port = os.environ.get("RECOMMENDATION_PORT", "9001")
product_ids = [value for value in "${RECOMMENDATION_PRODUCT_IDS}".split(",") if value]
channel = grpc.insecure_channel(f"127.0.0.1:{port}")
stub = demo_pb2_grpc.RecommendationServiceStub(channel)
for index in range(int("${RECOMMENDATION_REQUEST_COUNT}")):
    response = stub.ListRecommendations(
        demo_pb2.ListRecommendationsRequest(
            user_id="${RECOMMENDATION_USER_ID}",
            product_ids=product_ids,
        )
    )
    print(f"request {index + 1}: {list(response.product_ids)[:3]}")
    time.sleep(float("${RECOMMENDATION_REQUEST_DELAY_SECONDS}"))
PY
