/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to You under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

//! MCP Bash Server.

use std::{net::SocketAddr, sync::Arc};

use anyhow::{Context, Result, bail};
use axum::{
    Router,
    body::Body,
    http::Request,
    middleware::{self, Next},
    response::{Html, Response},
    routing::{get, post},
};
use rmcp::transport::streamable_http_server::{
    StreamableHttpService, session::local::LocalSessionManager,
};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod common;
use common::bash_server::BashServer;
use common::config;
use common::oauth::{
    McpOAuthStore, generate_random_string, oauth_approve, oauth_authorization_server,
    oauth_authorize, oauth_register, oauth_token, parse_trusted_proxy_cidrs,
    validate_public_base_url, validate_token_middleware,
};

const INDEX_HTML: &str = include_str!("html/mcp_oauth_index.html");

async fn index() -> Html<&'static str> {
    Html(INDEX_HTML)
}

/// Log request metadata without reading form bodies or emitting credentials.
async fn log_request(request: Request<Body>, next: Next) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let version = request.version();
    let headers = request.headers().clone();
    let mut header_log = String::new();
    for (key, value) in &headers {
        let value = if key == "authorization" || key == "cookie" {
            "<redacted>"
        } else {
            value.to_str().unwrap_or("<binary>")
        };
        header_log.push_str(&format!("\n  {key}: {value}"));
    }
    info!("REQUEST: {method} {uri} {version:?}{header_log}");
    let response = next.run(request).await;
    info!("RESPONSE: {} for {} {}", response.status(), method, uri);
    response
}

fn approval_secret_for_mode(is_dev: bool, configured: Option<String>) -> Result<String> {
    if is_dev {
        return Ok(configured.unwrap_or_else(|| generate_random_string(32)));
    }
    let approval_secret = configured
        .context("MCP_OAUTH_APPROVAL_SECRET must be set when the server runs in production mode")?;
    if approval_secret.len() < 32 {
        bail!("MCP_OAUTH_APPROVAL_SECRET must contain at least 32 characters");
    }
    Ok(approval_secret)
}

fn public_base_url_for_mode(
    is_dev: bool,
    configured: Option<String>,
    bind_address: &str,
) -> Result<url::Url> {
    if let Some(configured) = configured {
        return validate_public_base_url(&configured, !is_dev)
            .map_err(|message| anyhow::anyhow!(message));
    }
    if !is_dev {
        bail!("MCP_OAUTH_PUBLIC_BASE_URL must be set when the server runs in production mode");
    }
    let local_address = bind_address.replacen("0.0.0.0", "127.0.0.1", 1);
    validate_public_base_url(&format!("http://{local_address}"), false)
        .map_err(|message| anyhow::anyhow!(message))
}

#[tokio::main]
async fn main() -> Result<()> {
    let logs = tracing_appender::rolling::daily("logs", "mcp.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(logs);
    let log_setting = tracing_subscriber::fmt::layer().with_writer(non_blocking);
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "debug".to_string().into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .with(log_setting)
        .init();

    let config = config::Config::read_config("config.toml")?;
    let env_mode = config
        .settings
        .env
        .clone()
        .unwrap_or_else(|| "production".to_string());
    let is_dev = env_mode == "development";
    let host = config.settings.host.clone();
    let port = config.settings.port;
    let bind_address = format!("{host}:{port}");
    let addr = bind_address.parse::<SocketAddr>()?;

    let approval_secret =
        approval_secret_for_mode(is_dev, std::env::var("MCP_OAUTH_APPROVAL_SECRET").ok())?;
    let public_base_url = public_base_url_for_mode(
        is_dev,
        std::env::var("MCP_OAUTH_PUBLIC_BASE_URL").ok(),
        &bind_address,
    )?;
    let trusted_proxy_config = std::env::var("MCP_OAUTH_TRUSTED_PROXY_CIDRS").ok();
    let trusted_proxies = parse_trusted_proxy_cidrs(trusted_proxy_config.as_deref())
        .map_err(|message| anyhow::anyhow!(message))?;
    let oauth_store = Arc::new(McpOAuthStore::with_trusted_proxies(
        approval_secret,
        public_base_url,
        trusted_proxies,
    ));

    let service = StreamableHttpService::new(
        || Ok(BashServer::new()),
        LocalSessionManager::default().into(),
        Default::default(),
    );
    let server_router = Router::new().nest_service("/mcp", service);
    let protected_server_router = if is_dev {
        server_router
    } else {
        server_router.layer(middleware::from_fn_with_state(
            oauth_store.clone(),
            validate_token_middleware,
        ))
    };

    let cors_layer = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    let oauth_server_router = Router::new()
        .route(
            "/.well-known/oauth-authorization-server",
            get(oauth_authorization_server).options(oauth_authorization_server),
        )
        .route("/token", post(oauth_token).options(oauth_token))
        .route("/register", post(oauth_register).options(oauth_register))
        .layer(cors_layer)
        .with_state(oauth_store.clone());

    let app = Router::new()
        .route("/", get(index))
        .route("/authorize", get(oauth_authorize))
        .route("/approve", post(oauth_approve))
        .merge(oauth_server_router)
        .merge(protected_server_router)
        .with_state(oauth_store)
        .layer(middleware::from_fn(log_request));

    info!("MCP OAuth Server started on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    let _ = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async { tokio::signal::ctrl_c().await.unwrap() })
    .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn index_handler_returns_oauth_page() {
        let response = index().await;
        assert_eq!(response.0, INDEX_HTML);
        assert!(response.0.contains("OAuth"));
    }

    #[test]
    fn production_requires_strong_approval_secret() {
        assert!(approval_secret_for_mode(false, None).is_err());
        assert!(approval_secret_for_mode(false, Some("too-short".to_string())).is_err());
        let configured = "resource-owner-secret-with-32-characters".to_string();
        assert_eq!(
            approval_secret_for_mode(false, Some(configured.clone())).unwrap(),
            configured
        );
    }

    #[test]
    fn production_requires_explicit_https_public_base_url() {
        assert!(public_base_url_for_mode(false, None, "0.0.0.0:4000").is_err());
        assert!(
            public_base_url_for_mode(
                false,
                Some("http://mcp.example".to_string()),
                "0.0.0.0:4000"
            )
            .is_err()
        );
        assert_eq!(
            public_base_url_for_mode(
                false,
                Some("https://mcp.example".to_string()),
                "0.0.0.0:4000"
            )
            .unwrap()
            .as_str(),
            "https://mcp.example/"
        );
    }

    #[test]
    fn development_uses_safe_loopback_metadata_address() {
        assert_eq!(
            public_base_url_for_mode(true, None, "0.0.0.0:4000")
                .unwrap()
                .as_str(),
            "http://127.0.0.1:4000/"
        );
    }
}
