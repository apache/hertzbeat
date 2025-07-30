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

# Multi-stage build for mcp-bash-server
# Stage 1: Build stage
FROM ubuntu:noble AS builder

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV RUST_VERSION=stable
ENV PATH="/root/.cargo/bin:${PATH}"

# Set proxy environment variables if needed
# Uncomment the following lines if you need to use a proxy
ENV https_proxy=http://172.17.0.1:7897
ENV http_proxy=http://172.17.0.1:7897

# Change the sources list to use a custom Ubuntu source
# Uncomment the following lines if you use the default Ubuntu sources
COPY ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources

# Install build dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${RUST_VERSION}

# Set working directory
WORKDIR /app

# Copy the mcp-bash-server project
COPY mcp-bash-server/ .

# Build the project in release mode
RUN cargo build --release

# Stage 2: Runtime stage
FROM ubuntu:noble AS runtime

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    bash \
    coreutils \
    procps \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN useradd -m -s /bin/bash mcpuser

# Set working directory
WORKDIR /app

# Copy the compiled binary from builder stage
COPY --from=builder /app/target/release/mcp-bash-server /app/mcp-bash-server

# Copy configuration and templates
COPY --from=builder /app/config.toml /app/config.toml
COPY --from=builder /app/templates/ /app/templates/

# Create logs directory and set permissions
RUN mkdir -p logs && chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# Expose the port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/ || exit 1

# Set the entrypoint to run the mcp-bash-server
CMD ["./mcp-bash-server"]
