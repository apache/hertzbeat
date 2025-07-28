//! MCP Bash Server - A Model Context Protocol server for executing bash commands
//!
//! This server provides secure bash command execution capabilities through the MCP protocol.
//! It includes OAuth2 authentication, command validation, and cross-platform support.
//!
//! Features:
//! - Secure command execution with blacklist validation
//! - OAuth2 authentication for client authorization  
//! - Cross-platform shell support (Linux, Windows, macOS)
//! - Built-in system information tools
//! - Configurable timeout and environment settings

use std::sync::OnceLock;
use std::{net::SocketAddr, sync::Arc};

use anyhow::Result;
use axum::{
    Router,
    body::Body,
    http::{HeaderMap, Request},
    middleware::{self, Next},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
};
use rmcp::transport::streamable_http_server::{
    StreamableHttpService, session::local::LocalSessionManager,
};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

// Import modules
mod common;
use common::bash_server::BashServer;
use common::config;
use common::oauth::{
    McpOAuthStore, oauth_approve, oauth_authorization_server, oauth_authorize, oauth_register,
    oauth_token, validate_token_middleware,
};

const INDEX_HTML: &str = include_str!("html/mcp_oauth_index.html");

/// Global storage for server bind address, initialized once at startup
// Init once from environment variable BIND_ADDRESS
pub static BIND_ADDRESS: OnceLock<String> = OnceLock::new();

/// Root path handler
/// Serves the main OAuth authorization index page
async fn index() -> Html<&'static str> {
    Html(INDEX_HTML)
}

/// Wrapper function for oauth_authorization_server to handle BIND_ADDRESS
async fn oauth_authorization_server_handler(headers: HeaderMap) -> impl IntoResponse {
    let bind_address = BIND_ADDRESS
        .get()
        .expect("BIND_ADDRESS must be initialized in main()");
    oauth_authorization_server(bind_address, headers).await
}

/// HTTP request logging middleware
/// Logs all incoming requests including method, URI, headers and response status
async fn log_request(request: Request<Body>, next: Next) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let version = request.version();

    // Log headers
    let headers = request.headers().clone();
    let mut header_log = String::new();
    for (key, value) in headers.iter() {
        let value_str = value.to_str().unwrap_or("<binary>");
        header_log.push_str(&format!("\n  {key}: {value_str}"));
    }

    // Try to get request body for form submissions
    let content_type = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let request_info = if content_type.contains("application/x-www-form-urlencoded")
        || content_type.contains("application/json")
    {
        format!("{method} {uri} {version:?}{header_log}\nContent-Type: {content_type}")
    } else {
        format!("{method} {uri} {version:?}{header_log}")
    };

    info!("REQUEST: {}", request_info);

    // Call the actual handler
    let response = next.run(request).await;

    // Log response status
    let status = response.status();
    info!("RESPONSE: {} for {} {}", status, method, uri);

    response
}

/// Main application entry point
/// Sets up logging, OAuth store, HTTP server, and starts the MCP bash server
#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
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

    // Read environment mode from config file, default to "production"
    let config = config::Config::read_config("config.toml")?;
    let env_mode = config
        .settings
        .env
        .clone()
        .unwrap_or_else(|| "production".to_string());
    let is_dev = env_mode == "development";

    // Create the OAuth store
    let oauth_store = Arc::new(McpOAuthStore::new());

    let host = config.settings.host.clone();
    let port = config.settings.port;
    let bind_address = format!("{host}:{port}");

    let addr = bind_address.parse::<SocketAddr>()?;
    let _ = BIND_ADDRESS.set(bind_address);

    // Create StreamableHttpServer
    let service = StreamableHttpService::new(
        || Ok(BashServer::new()),
        LocalSessionManager::default().into(),
        Default::default(),
    );

    let server_router = Router::new().nest_service("/mcp", service);

    // Add OAuth authentication middleware only if not in development mode
    let protected_server_router = if is_dev {
        server_router
    } else {
        server_router.layer(middleware::from_fn_with_state(
            oauth_store.clone(),
            validate_token_middleware,
        ))
    };

    // Create CORS layer for the oauth authorization server endpoint
    let cors_layer = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Create a sub-router for the oauth authorization server endpoint with CORS
    let oauth_server_router = Router::new()
        .route(
            "/.well-known/oauth-authorization-server",
            get(oauth_authorization_server_handler).options(oauth_authorization_server_handler),
        )
        .route("/token", post(oauth_token).options(oauth_token))
        .route("/register", post(oauth_register).options(oauth_register))
        .layer(cors_layer)
        .with_state(oauth_store.clone());

    // Create HTTP router with request logging middleware
    let app = Router::new()
        .route("/", get(index))
        .route("/authorize", get(oauth_authorize))
        .route("/approve", post(oauth_approve))
        .merge(oauth_server_router) // Merge the CORS-enabled oauth server router
        .merge(protected_server_router)
        .with_state(oauth_store.clone())
        .layer(middleware::from_fn(log_request));

    // Start HTTP server
    info!("MCP OAuth Server started on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    let _ = axum::serve(listener, app)
        .with_graceful_shutdown(async { tokio::signal::ctrl_c().await.unwrap() })
        .await;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Method;
    use axum::http::Request;

    #[tokio::test]
    async fn test_index_handler() {
        let response = index().await;
        let html_content = response.0;

        // Verify it returns the expected HTML content
        assert_eq!(html_content, INDEX_HTML);
        assert!(html_content.contains("OAuth"));
    }

    #[tokio::test]
    async fn test_oauth_authorization_server_handler() {
        use axum::http::HeaderMap;

        // Set up BIND_ADDRESS for testing
        let _ = BIND_ADDRESS.set("localhost:8080".to_string());

        let mut headers = HeaderMap::new();
        headers.insert("host", "localhost:8080".parse().unwrap());

        let response = oauth_authorization_server_handler(headers).await;

        // Test that the handler returns a response
        // We can't easily test the exact content without mocking, but we can verify it doesn't panic
        let _response_body = response.into_response();
    }

    #[test]
    fn test_bind_address_initialization() {
        // Create a new OnceLock for testing to avoid conflicts
        let test_bind_address: OnceLock<String> = OnceLock::new();

        // Test that we can set the value once
        let result = test_bind_address.set("127.0.0.1:9090".to_string());
        assert!(result.is_ok());

        // Test that we can get the value
        let value = test_bind_address.get();
        assert!(value.is_some());
        assert_eq!(value.unwrap(), "127.0.0.1:9090");

        // Test that we can't set it again
        let result2 = test_bind_address.set("different:port".to_string());
        assert!(result2.is_err());
    }

    #[test]
    fn test_index_html_constant() {
        // Test that INDEX_HTML is not empty and contains expected content
        assert!(!INDEX_HTML.is_empty());
        assert!(INDEX_HTML.contains("html") || INDEX_HTML.contains("HTML"));
    }

    #[tokio::test]
    async fn test_log_request_middleware_functionality() {
        // Test basic properties of log_request function
        // Since it requires complex setup with actual middleware,
        // we focus on testing the types and structure

        let request = Request::builder()
            .method(Method::GET)
            .uri("/test")
            .body(Body::empty())
            .unwrap();

        // Verify request properties that log_request would process
        assert_eq!(request.method(), Method::GET);
        assert_eq!(request.uri().path(), "/test");
        assert!(request.headers().is_empty());
    }

    #[test]
    fn test_module_imports() {
        // Test that our modules are properly imported and accessible
        let _server = BashServer::new();
        let _store = McpOAuthStore::new();

        // Test config module
        let config_result = config::Config::read_config("nonexistent.toml");
        assert!(config_result.is_err()); // Should fail gracefully
    }

    #[test]
    fn test_constants_and_statics() {
        // Test that our constants and statics are properly defined
        assert!(!INDEX_HTML.is_empty());

        // BIND_ADDRESS should be a valid OnceLock
        // We can't test the value without potentially interfering with other tests,
        // but we can verify the type is correct by using it
        let _bind_addr_ref = &BIND_ADDRESS;
    }

    #[test]
    fn test_error_handling_types() {
        // Test that Result type is properly used
        let test_result: Result<String> = Ok("test".to_string());
        assert!(test_result.is_ok());

        let test_error: Result<String> = Err(anyhow::anyhow!("test error"));
        assert!(test_error.is_err());
    }

    #[test]
    fn test_dependencies_availability() {
        // Test that critical dependencies are available
        use std::sync::Arc;

        let _arc_store = Arc::new(McpOAuthStore::new());

        // Test that we can create basic types
        let _socket_addr: Result<SocketAddr, _> = "127.0.0.1:8080".parse();
    }

    // ========== OAuth Mock Tests ==========

    #[tokio::test]
    async fn test_oauth_store_functionality() {
        use common::oauth::{AuthToken, McpOAuthStore};
        use oauth2::{AccessToken, EmptyExtraTokenFields};

        let store = McpOAuthStore::new();

        // Test client validation
        let client = store
            .validate_client("mcp-client", "http://localhost:8080/callback")
            .await;
        assert!(client.is_some());

        let invalid_client = store
            .validate_client("invalid-client", "http://localhost:8080/callback")
            .await;
        assert!(invalid_client.is_none());

        // Test auth session creation
        let session_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile email".to_string()),
                Some("test-state".to_string()),
                "test-session-123".to_string(),
            )
            .await;

        assert_eq!(session_id, "test-session-123");

        // Test token update and MCP token creation
        let auth_token = AuthToken::new(
            AccessToken::new("mock-third-party-token".to_string()),
            oauth2::basic::BasicTokenType::Bearer,
            EmptyExtraTokenFields {},
        );

        let update_result = store
            .update_auth_session_token(&session_id, auth_token)
            .await;
        assert!(update_result.is_ok());

        let mcp_token = store.create_mcp_token(&session_id).await;
        assert!(mcp_token.is_ok());

        let token = mcp_token.unwrap();
        assert!(token.access_token.starts_with("mcp-token-"));
        assert_eq!(token.client_id, "mcp-client");

        // Test token validation
        let validated = store.validate_token(&token.access_token).await;
        assert!(validated.is_some());
    }

    #[tokio::test]
    async fn test_oauth_authorization_flow_mock() {
        use common::oauth::{AuthorizeQuery, McpOAuthStore};
        use std::sync::Arc;

        let store = Arc::new(McpOAuthStore::new());

        // Mock authorization request
        let auth_query = AuthorizeQuery {
            response_type: "code".to_string(),
            client_id: "mcp-client".to_string(),
            redirect_uri: "http://localhost:8080/callback".to_string(),
            scope: Some("profile email".to_string()),
            state: Some("test-state-456".to_string()),
        };

        // Test that oauth_authorize function can be called
        // Note: In a real test, we'd use test frameworks like tower::ServiceExt
        // but here we're testing the basic functionality
        let store_clone = store.clone();
        let sessions_before = store_clone.auth_sessions.read().await.len();

        // Verify store is accessible and functional
        assert_eq!(sessions_before, 0);

        // Test client validation within the flow
        let client_validation = store
            .validate_client(&auth_query.client_id, &auth_query.redirect_uri)
            .await;
        assert!(client_validation.is_some());
    }

    #[tokio::test]
    async fn test_oauth_token_exchange_mock() {
        use common::oauth::AuthToken;
        use common::oauth::{McpOAuthStore, TokenRequest};
        use oauth2::{AccessToken, EmptyExtraTokenFields};
        use std::sync::Arc;

        let store = Arc::new(McpOAuthStore::new());

        // Create a session and add auth token (simulating successful OAuth flow)
        let session_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile".to_string()),
                Some("test-state".to_string()),
                "token-exchange-session".to_string(),
            )
            .await;

        let auth_token = AuthToken::new(
            AccessToken::new("mock-external-token".to_string()),
            oauth2::basic::BasicTokenType::Bearer,
            EmptyExtraTokenFields {},
        );

        store
            .update_auth_session_token(&session_id, auth_token)
            .await
            .unwrap();

        // Mock token request (just for structure validation)
        let _token_request = TokenRequest {
            grant_type: "authorization_code".to_string(),
            code: "mock-auth-code".to_string(),
            client_id: "mcp-client".to_string(),
            client_secret: "mcp-client-secret".to_string(),
            redirect_uri: "http://localhost:8080/callback".to_string(),
            code_verifier: None,
            refresh_token: "".to_string(),
        };

        // Test token creation
        let mcp_token_result = store.create_mcp_token(&session_id).await;
        assert!(mcp_token_result.is_ok());

        let mcp_token = mcp_token_result.unwrap();
        assert_eq!(mcp_token.token_type, "bearer");
        assert_eq!(mcp_token.expires_in, Some(3600));
        assert!(mcp_token.refresh_token.is_some());

        // Verify token can be validated
        let validation_result = store.validate_token(&mcp_token.access_token).await;
        assert!(validation_result.is_some());
    }

    #[tokio::test]
    async fn test_oauth_middleware_functionality() {
        use common::oauth::AuthToken;
        use common::oauth::McpOAuthStore;
        use oauth2::{AccessToken, EmptyExtraTokenFields};
        use std::sync::Arc;

        let store = Arc::new(McpOAuthStore::new());

        // Create a valid token for middleware testing
        let session_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile".to_string()),
                None,
                "middleware-test-session".to_string(),
            )
            .await;

        let auth_token = AuthToken::new(
            AccessToken::new("middleware-test-token".to_string()),
            oauth2::basic::BasicTokenType::Bearer,
            EmptyExtraTokenFields {},
        );

        store
            .update_auth_session_token(&session_id, auth_token)
            .await
            .unwrap();
        let mcp_token = store.create_mcp_token(&session_id).await.unwrap();

        // Test token validation (simulating middleware behavior)
        let valid_token_check = store.validate_token(&mcp_token.access_token).await;
        assert!(valid_token_check.is_some());

        // Test invalid token
        let invalid_token_check = store.validate_token("invalid-token-12345").await;
        assert!(invalid_token_check.is_none());

        // Test empty token
        let empty_token_check = store.validate_token("").await;
        assert!(empty_token_check.is_none());
    }

    #[tokio::test]
    async fn test_oauth_error_handling() {
        use common::oauth::McpOAuthStore;
        use std::sync::Arc;

        let store = Arc::new(McpOAuthStore::new());

        // Test creating MCP token without session
        let no_session_result = store.create_mcp_token("nonexistent-session").await;
        assert!(no_session_result.is_err());
        assert_eq!(no_session_result.unwrap_err(), "Session not found");

        // Test creating MCP token without auth token in session
        let session_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile".to_string()),
                None,
                "no-auth-token-session".to_string(),
            )
            .await;

        let no_auth_token_result = store.create_mcp_token(&session_id).await;
        assert!(no_auth_token_result.is_err());
        assert_eq!(
            no_auth_token_result.unwrap_err(),
            "No third-party token available for session"
        );

        // Test updating nonexistent session
        let auth_token = oauth2::StandardTokenResponse::new(
            oauth2::AccessToken::new("test-token".to_string()),
            oauth2::basic::BasicTokenType::Bearer,
            oauth2::EmptyExtraTokenFields {},
        );

        let update_nonexistent = store
            .update_auth_session_token("nonexistent", auth_token)
            .await;
        assert!(update_nonexistent.is_err());
        assert_eq!(update_nonexistent.unwrap_err(), "Session not found");
    }

    #[tokio::test]
    async fn test_oauth_security_validations() {
        use common::oauth::McpOAuthStore;
        use std::sync::Arc;

        let store = Arc::new(McpOAuthStore::new());

        // Test invalid client ID
        let invalid_client = store
            .validate_client("malicious-client", "http://localhost:8080/callback")
            .await;
        assert!(invalid_client.is_none());

        // Test invalid redirect URI (potential open redirect attack)
        let malicious_redirect = store
            .validate_client("mcp-client", "http://evil.com/steal-tokens")
            .await;
        assert!(malicious_redirect.is_none());

        // Test valid client with valid redirect URI
        let valid_client = store
            .validate_client("mcp-client", "http://localhost:8080/callback")
            .await;
        assert!(valid_client.is_some());

        // Test that tokens are properly random and unique
        let session1_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile".to_string()),
                None,
                "security-test-1".to_string(),
            )
            .await;

        let session2_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile".to_string()),
                None,
                "security-test-2".to_string(),
            )
            .await;

        // Add auth tokens to both sessions
        for (i, session_id) in [&session1_id, &session2_id].iter().enumerate() {
            let auth_token = oauth2::StandardTokenResponse::new(
                oauth2::AccessToken::new(format!("security-token-{}", i)),
                oauth2::basic::BasicTokenType::Bearer,
                oauth2::EmptyExtraTokenFields {},
            );
            store
                .update_auth_session_token(session_id, auth_token)
                .await
                .unwrap();
        }

        let token1 = store.create_mcp_token(&session1_id).await.unwrap();
        let token2 = store.create_mcp_token(&session2_id).await.unwrap();

        // Tokens should be different
        assert_ne!(token1.access_token, token2.access_token);
        assert_ne!(token1.refresh_token, token2.refresh_token);

        // Both should be valid
        assert!(store.validate_token(&token1.access_token).await.is_some());
        assert!(store.validate_token(&token2.access_token).await.is_some());
    }
}
