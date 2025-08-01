/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//! OAuth2 authentication implementation for MCP server
//!
//! This module provides OAuth2 authentication capabilities including:
//! - Client registration and validation
//! - Authorization code flow
//! - Token management and validation
//! - Session management for auth flows
//! - Middleware for request authentication

use std::{collections::HashMap, sync::Arc};

use askama::Template;
use axum::{
    Json,
    body::Body,
    extract::{Form, Query, State},
    http::{HeaderMap, Request, StatusCode},
    middleware::Next,
    response::{Html, IntoResponse, Redirect, Response},
};
use chrono;
use oauth2::{AccessToken, EmptyExtraTokenFields, RefreshToken, StandardTokenResponse};
use rand::{Rng, distributions::Alphanumeric};
use rmcp::serde_json::{self, Value};
use rmcp::transport::auth::{
    AuthorizationMetadata, ClientRegistrationRequest, ClientRegistrationResponse, OAuthClientConfig,
};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

/// Type alias for OAuth2 standard token response
/// Type alias for OAuth2 standard token response
pub type AuthToken = StandardTokenResponse<EmptyExtraTokenFields, oauth2::basic::BasicTokenType>;

/// Centralized OAuth store for managing clients, sessions, and tokens
/// Provides thread-safe access to OAuth-related data structures
#[derive(Clone, Debug)]
pub struct McpOAuthStore {
    /// Registered OAuth clients with their configurations
    pub clients: Arc<RwLock<HashMap<String, OAuthClientConfig>>>,
    /// Active authorization sessions indexed by session ID
    pub auth_sessions: Arc<RwLock<HashMap<String, AuthSession>>>,
    /// Valid access tokens indexed by token string
    pub access_tokens: Arc<RwLock<HashMap<String, McpAccessToken>>>,
}

impl McpOAuthStore {
    /// Create a new OAuth store with a default client configuration
    pub fn new() -> Self {
        let mut clients = HashMap::new();
        clients.insert(
            "mcp-client".to_string(),
            OAuthClientConfig {
                client_id: "mcp-client".to_string(),
                client_secret: Some("mcp-client-secret".to_string()),
                scopes: vec!["profile".to_string(), "email".to_string()],
                redirect_uri: "http://localhost:8080/callback".to_string(),
            },
        );

        Self {
            clients: Arc::new(RwLock::new(clients)),
            auth_sessions: Arc::new(RwLock::new(HashMap::new())),
            access_tokens: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Validate client credentials and redirect URI
    /// Returns Some(client_config) if valid, None otherwise
    pub async fn validate_client(
        &self,
        client_id: &str,
        redirect_uri: &str,
    ) -> Option<OAuthClientConfig> {
        let clients = self.clients.read().await;
        if let Some(client) = clients.get(client_id) {
            if client.redirect_uri == redirect_uri {
                return Some(client.clone());
            }
        }
        None
    }

    /// Create a new authorization session for the OAuth flow
    /// Returns the session ID for tracking the auth process
    pub async fn create_auth_session(
        &self,
        client_id: String,
        scope: Option<String>,
        state: Option<String>,
        session_id: String,
    ) -> String {
        let session = AuthSession {
            client_id,
            scope,
            _state: state,
            _created_at: chrono::Utc::now(),
            auth_token: None,
        };

        self.auth_sessions
            .write()
            .await
            .insert(session_id.clone(), session);
        session_id
    }

    /// Update an authorization session with a generated token
    /// Links the OAuth token to the session for later retrieval
    pub async fn update_auth_session_token(
        &self,
        session_id: &str,
        token: AuthToken,
    ) -> Result<(), String> {
        let mut sessions = self.auth_sessions.write().await;
        if let Some(session) = sessions.get_mut(session_id) {
            session.auth_token = Some(token);
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    /// Create a new MCP access token linked to an authorization session
    /// Returns the generated McpAccessToken on success
    pub async fn create_mcp_token(&self, session_id: &str) -> Result<McpAccessToken, String> {
        let sessions = self.auth_sessions.read().await;
        if let Some(session) = sessions.get(session_id) {
            if let Some(auth_token) = &session.auth_token {
                let access_token = format!("mcp-token-{}", Uuid::new_v4());
                let refresh_token = format!("mcp-refresh-{}", Uuid::new_v4());

                let token = McpAccessToken {
                    access_token: access_token.clone(),
                    token_type: "Bearer".to_string().to_lowercase(),
                    expires_in: Some(3600),
                    refresh_token: Some(refresh_token),
                    scope: session.scope.clone(),
                    auth_token: auth_token.clone(),
                    client_id: session.client_id.clone(),
                };

                self.access_tokens
                    .write()
                    .await
                    .insert(access_token.clone(), token.clone());
                Ok(token)
            } else {
                Err("No third-party token available for session".to_string())
            }
        } else {
            Err("Session not found".to_string())
        }
    }

    /// Validate an access token and return the associated McpAccessToken if valid
    pub async fn validate_token(&self, token: &str) -> Option<McpAccessToken> {
        self.access_tokens.read().await.get(token).cloned()
    }
}

/// Authorization session data structure
/// Tracks ongoing OAuth authorization flows with client and state information
#[derive(Clone, Debug)]
pub struct AuthSession {
    pub client_id: String,
    pub scope: Option<String>,
    pub _state: Option<String>,
    pub _created_at: chrono::DateTime<chrono::Utc>,
    pub auth_token: Option<AuthToken>,
}

/// MCP-specific access token structure
/// Wraps OAuth2 standard tokens with additional MCP metadata
#[derive(Clone, Debug, Serialize)]
pub struct McpAccessToken {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: Option<u64>,
    pub refresh_token: Option<String>,
    pub scope: Option<String>,
    pub auth_token: AuthToken,
    pub client_id: String,
}

/// OAuth authorization request parameters
/// Contains all required fields for initiating an OAuth authorization flow
#[derive(Debug, Deserialize)]
pub struct AuthorizeQuery {
    #[allow(dead_code)]
    pub response_type: String,
    pub client_id: String,
    pub redirect_uri: String,
    pub scope: Option<String>,
    pub state: Option<String>,
}

/// OAuth token request parameters
/// Used for exchanging authorization codes for access tokens
#[derive(Debug, Deserialize, Serialize)]
pub struct TokenRequest {
    pub grant_type: String,
    #[serde(default)]
    pub code: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub client_secret: String,
    #[serde(default)]
    pub redirect_uri: String,
    #[serde(default)]
    pub code_verifier: Option<String>,
    #[serde(default)]
    pub refresh_token: String,
}

/// User information structure for OAuth responses
/// Contains standard user profile data
#[derive(Debug, Deserialize, Serialize)]
pub struct UserInfo {
    pub sub: String,
    pub name: String,
    pub email: String,
    pub username: String,
}

/// Template context for OAuth authorization page
/// Contains all data needed to render the authorization consent form
#[derive(Template)]
#[template(path = "mcp_oauth_authorize.html")]
pub struct OAuthAuthorizeTemplate {
    pub client_id: String,
    pub redirect_uri: String,
    pub scope: String,
    pub state: String,
    pub scopes: String,
}

/// Form data for user authorization approval
/// Contains user's decision and associated OAuth parameters
#[derive(Debug, Deserialize)]
pub struct ApprovalForm {
    pub client_id: String,
    pub redirect_uri: String,
    pub scope: String,
    pub state: String,
    pub approved: String,
}

/// Generate a cryptographically secure random string
/// Used for creating client secrets and other security tokens
pub fn generate_random_string(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

/// OAuth authorization endpoint handler
/// Displays the authorization consent page to users
pub async fn oauth_authorize(
    Query(params): Query<AuthorizeQuery>,
    State(state): State<Arc<McpOAuthStore>>,
) -> impl IntoResponse {
    debug!("doing oauth_authorize");
    if let Some(_client) = state
        .validate_client(&params.client_id, &params.redirect_uri)
        .await
    {
        let template = OAuthAuthorizeTemplate {
            client_id: params.client_id,
            redirect_uri: params.redirect_uri,
            scope: params.scope.clone().unwrap_or_default(),
            state: params.state.clone().unwrap_or_default(),
            scopes: params
                .scope
                .clone()
                .unwrap_or_else(|| "Basic scope".to_string()),
        };

        Html(template.render().unwrap()).into_response()
    } else {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "invalid_request",
                "error_description": "invalid client id or redirect uri"
            })),
        )
            .into_response()
    }
}

/// Handle user approval/rejection of OAuth authorization
/// Processes the consent form and generates authorization codes
pub async fn oauth_approve(
    State(state): State<Arc<McpOAuthStore>>,
    Form(form): Form<ApprovalForm>,
) -> impl IntoResponse {
    if form.approved != "true" {
        // user rejected the authorization request
        let redirect_url = format!(
            "{}?error=access_denied&error_description={}{}",
            form.redirect_uri,
            "user rejected the authorization request",
            if form.state.is_empty() {
                "".to_string()
            } else {
                format!("&state={}", form.state)
            }
        );
        return Redirect::to(&redirect_url).into_response();
    }

    // user approved the authorization request, generate authorization code
    let session_id = Uuid::new_v4().to_string();
    let auth_code = format!("mcp-code-{session_id}");

    // create new session record authorization information
    let session_id = state
        .create_auth_session(
            form.client_id.clone(),
            Some(form.scope.clone()),
            Some(form.state.clone()),
            session_id.clone(),
        )
        .await;

    // create token using oauth2 standard
    let access_token = AccessToken::new(format!("tp-token-{}", Uuid::new_v4()));
    let refresh_token = RefreshToken::new(format!("tp-refresh-{}", Uuid::new_v4()));
    let token_type = oauth2::basic::BasicTokenType::Bearer;

    let mut created_token =
        StandardTokenResponse::new(access_token, token_type, EmptyExtraTokenFields {});
    created_token.set_expires_in(Some(&std::time::Duration::from_secs(3600)));
    created_token.set_refresh_token(Some(refresh_token));
    created_token.set_scopes(Some(vec![oauth2::Scope::new(form.scope.clone())]));

    // update session token
    if let Err(e) = state
        .update_auth_session_token(&session_id, created_token)
        .await
    {
        error!("Failed to update session token: {}", e);
    }

    // redirect back to client, with authorization code
    let redirect_url = format!(
        "{}?code={}{}",
        form.redirect_uri,
        auth_code,
        if form.state.is_empty() {
            "".to_string()
        } else {
            format!("&state={}", form.state)
        }
    );

    info!("authorization approved, redirecting to: {}", redirect_url);
    Redirect::to(&redirect_url).into_response()
}

/// OAuth token endpoint handler
/// Exchanges authorization codes for access tokens
pub async fn oauth_token(
    State(state): State<Arc<McpOAuthStore>>,
    request: axum::http::Request<Body>,
) -> impl IntoResponse {
    info!("Received token request");

    let bytes = match axum::body::to_bytes(request.into_body(), usize::MAX).await {
        Ok(bytes) => bytes,
        Err(e) => {
            error!("can't read request body: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "invalid_request",
                    "error_description": "can't read request body"
                })),
            )
                .into_response();
        }
    };

    let body_str = String::from_utf8_lossy(&bytes);
    info!("request body: {}", body_str);

    let token_req = match serde_urlencoded::from_bytes::<TokenRequest>(&bytes) {
        Ok(form) => {
            info!("successfully parsed form data: {:?}", form);
            form
        }
        Err(e) => {
            error!("can't parse form data: {}", e);
            return (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(serde_json::json!({
                    "error": "invalid_request",
                    "error_description": format!("can't parse form data: {}", e)
                })),
            )
                .into_response();
        }
    };
    if token_req.grant_type == "refresh_token" {
        warn!("this easy server only support authorization_code now");
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "unsupported_grant_type",
                "error_description": "only authorization_code is supported"
            })),
        )
            .into_response();
    }
    if token_req.grant_type != "authorization_code" {
        info!("unsupported grant type: {}", token_req.grant_type);
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "unsupported_grant_type",
                "error_description": "only authorization_code is supported"
            })),
        )
            .into_response();
    }

    // get session_id from code
    if !token_req.code.starts_with("mcp-code-") {
        info!("invalid authorization code: {}", token_req.code);
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "invalid_grant",
                "error_description": "invalid authorization code"
            })),
        )
            .into_response();
    }

    // handle empty client_id
    let client_id = if token_req.client_id.is_empty() {
        "mcp-client".to_string()
    } else {
        token_req.client_id.clone()
    };

    // validate client
    match state
        .validate_client(&client_id, &token_req.redirect_uri)
        .await
    {
        Some(_) => {
            let session_id = token_req.code.replace("mcp-code-", "");
            info!("got session id: {}", session_id);

            // create mcp access token
            match state.create_mcp_token(&session_id).await {
                Ok(token) => {
                    info!("successfully created access token");
                    (
                        StatusCode::OK,
                        Json(serde_json::json!({
                            "access_token": token.access_token,
                            "token_type": token.token_type,
                            "expires_in": token.expires_in,
                            "refresh_token": token.refresh_token,
                            "scope": token.scope,
                        })),
                    )
                        .into_response()
                }
                Err(e) => {
                    error!("failed to create access token: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({
                            "error": "server_error",
                            "error_description": format!("failed to create access token: {}", e)
                        })),
                    )
                        .into_response()
                }
            }
        }
        None => {
            info!(
                "invalid client id or redirect uri: {} / {}",
                client_id, token_req.redirect_uri
            );
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "invalid_client",
                    "error_description": "invalid client id or redirect uri"
                })),
            )
                .into_response()
        }
    }
}

/// Authentication middleware for validating Bearer tokens
/// Intercepts requests and validates access tokens before allowing access
pub async fn validate_token_middleware(
    State(token_store): State<Arc<McpOAuthStore>>,
    request: Request<axum::body::Body>,
    next: Next,
) -> Response {
    debug!("validate_token_middleware");
    // Extract the access token from the Authorization header
    let auth_header = request.headers().get("Authorization");
    let token = match auth_header {
        Some(header) => {
            let header_str = header.to_str().unwrap_or("");
            if let Some(stripped) = header_str.strip_prefix("Bearer ") {
                stripped.to_string()
            } else {
                return StatusCode::UNAUTHORIZED.into_response();
            }
        }
        None => {
            return StatusCode::UNAUTHORIZED.into_response();
        }
    };

    // Validate the token
    match token_store.validate_token(&token).await {
        Some(_) => next.run(request).await,
        None => StatusCode::UNAUTHORIZED.into_response(),
    }
}

/// Get the actual IP address to use for endpoints
/// Returns the host from request headers if bind_address is 0.0.0.0, otherwise returns the original address
fn get_endpoint_address(bind_address: &str, host_header: Option<&str>) -> String {
    if bind_address.starts_with("0.0.0.0") {
        if let Some(host) = host_header {
            // Use the Host header value, which contains the actual IP/domain the client used
            host.to_string()
        } else {
            // Fallback to localhost if no Host header is present
            bind_address.replacen("0.0.0.0", "localhost", 1)
        }
    } else {
        bind_address.to_string()
    }
}

/// OAuth authorization server metadata endpoint
/// Returns server capabilities and endpoint URLs per RFC 8414
pub async fn oauth_authorization_server(
    bind_address: &str,
    headers: HeaderMap,
) -> impl IntoResponse {
    let host_header = headers.get("host").and_then(|h| h.to_str().ok());
    let endpoint_address = get_endpoint_address(bind_address, host_header);

    let mut additional_fields = HashMap::new();
    additional_fields.insert(
        "response_types_supported".into(),
        Value::Array(vec![Value::String("code".into())]),
    );
    additional_fields.insert(
        "code_challenge_methods_supported".into(),
        Value::Array(vec![Value::String("S256".into())]),
    );
    let metadata = AuthorizationMetadata {
        authorization_endpoint: format!("http://{endpoint_address}/authorize"),
        token_endpoint: format!("http://{endpoint_address}/token"),
        scopes_supported: Some(vec!["profile".to_string(), "email".to_string()]),
        registration_endpoint: format!("http://{endpoint_address}/register"),
        issuer: Some(format!("http://{endpoint_address}")),
        jwks_uri: Some(format!("http://{endpoint_address}/jwks")),
        additional_fields,
    };
    debug!("metadata: {:?}", metadata);
    (StatusCode::OK, Json(metadata))
}

/// Dynamic client registration endpoint
/// Allows clients to register themselves with the OAuth server
pub async fn oauth_register(
    State(state): State<Arc<McpOAuthStore>>,
    Json(req): Json<ClientRegistrationRequest>,
) -> impl IntoResponse {
    debug!("register request: {:?}", req);
    if req.redirect_uris.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "invalid_request",
                "error_description": "at least one redirect uri is required"
            })),
        )
            .into_response();
    }

    // generate client id and secret
    let client_id = format!("client-{}", Uuid::new_v4());
    let client_secret = generate_random_string(32);

    let client = OAuthClientConfig {
        client_id: client_id.clone(),
        client_secret: Some(client_secret.clone()),
        redirect_uri: req.redirect_uris[0].clone(),
        scopes: vec![],
    };

    state
        .clients
        .write()
        .await
        .insert(client_id.clone(), client);

    // return client information
    let response = ClientRegistrationResponse {
        client_id,
        client_secret: Some(client_secret),
        client_name: req.client_name,
        redirect_uris: req.redirect_uris,
        additional_fields: HashMap::new(),
    };

    (StatusCode::CREATED, Json(response)).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_oauth_store() -> McpOAuthStore {
        McpOAuthStore::new()
    }

    #[tokio::test]
    async fn test_oauth_store_creation() {
        let store = create_test_oauth_store();

        // Check that default client exists
        let clients = store.clients.read().await;
        assert!(clients.contains_key("mcp-client"));

        let default_client = clients.get("mcp-client").unwrap();
        assert_eq!(default_client.client_id, "mcp-client");
        assert_eq!(
            default_client.client_secret,
            Some("mcp-client-secret".to_string())
        );
        assert!(default_client.scopes.contains(&"profile".to_string()));
        assert!(default_client.scopes.contains(&"email".to_string()));
    }

    #[tokio::test]
    async fn test_validate_client_success() {
        let store = create_test_oauth_store();

        let result = store
            .validate_client("mcp-client", "http://localhost:8080/callback")
            .await;
        assert!(result.is_some());

        let client = result.unwrap();
        assert_eq!(client.client_id, "mcp-client");
    }

    #[tokio::test]
    async fn test_validate_client_invalid_client_id() {
        let store = create_test_oauth_store();

        let result = store
            .validate_client("invalid-client", "http://localhost:8080/callback")
            .await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_validate_client_invalid_redirect_uri() {
        let store = create_test_oauth_store();

        let result = store
            .validate_client("mcp-client", "http://malicious.com/callback")
            .await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_create_auth_session() {
        let store = create_test_oauth_store();

        let session_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile email".to_string()),
                Some("state123".to_string()),
                "session123".to_string(),
            )
            .await;

        assert_eq!(session_id, "session123");

        // Verify session exists
        let sessions = store.auth_sessions.read().await;
        assert!(sessions.contains_key("session123"));

        let session = sessions.get("session123").unwrap();
        assert_eq!(session.client_id, "mcp-client");
        assert_eq!(session.scope, Some("profile email".to_string()));
        assert!(session.auth_token.is_none());
    }

    #[tokio::test]
    async fn test_update_auth_session_token() {
        let store = create_test_oauth_store();

        // Create session first
        let session_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile".to_string()),
                None,
                "session456".to_string(),
            )
            .await;

        // Create a mock token
        let token = AuthToken::new(
            AccessToken::new("access_token_123".to_string()),
            oauth2::basic::BasicTokenType::Bearer,
            EmptyExtraTokenFields {},
        );

        // Update session with token
        let result = store.update_auth_session_token(&session_id, token).await;
        assert!(result.is_ok());

        // Verify token was added
        let sessions = store.auth_sessions.read().await;
        let session = sessions.get("session456").unwrap();
        assert!(session.auth_token.is_some());
    }

    #[tokio::test]
    async fn test_update_auth_session_token_invalid_session() {
        let store = create_test_oauth_store();

        let token = AuthToken::new(
            AccessToken::new("access_token_123".to_string()),
            oauth2::basic::BasicTokenType::Bearer,
            EmptyExtraTokenFields {},
        );

        let result = store.update_auth_session_token("nonexistent", token).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Session not found");
    }

    #[tokio::test]
    async fn test_create_mcp_token_success() {
        let store = create_test_oauth_store();

        // Create session and update with auth token
        let session_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile".to_string()),
                None,
                "session789".to_string(),
            )
            .await;

        let auth_token = AuthToken::new(
            AccessToken::new("third_party_token".to_string()),
            oauth2::basic::BasicTokenType::Bearer,
            EmptyExtraTokenFields {},
        );

        store
            .update_auth_session_token(&session_id, auth_token)
            .await
            .unwrap();

        // Create MCP token
        let result = store.create_mcp_token(&session_id).await;
        assert!(result.is_ok());

        let mcp_token = result.unwrap();
        assert!(mcp_token.access_token.starts_with("mcp-token-"));
        assert!(
            mcp_token
                .refresh_token
                .as_ref()
                .unwrap()
                .starts_with("mcp-refresh-")
        );
        assert_eq!(mcp_token.token_type, "bearer");
        assert_eq!(mcp_token.expires_in, Some(3600));
        assert_eq!(mcp_token.scope, Some("profile".to_string()));
        assert_eq!(mcp_token.client_id, "mcp-client");
    }

    #[tokio::test]
    async fn test_create_mcp_token_no_session() {
        let store = create_test_oauth_store();

        let result = store.create_mcp_token("nonexistent").await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Session not found");
    }

    #[tokio::test]
    async fn test_create_mcp_token_no_auth_token() {
        let store = create_test_oauth_store();

        // Create session without auth token
        let session_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile".to_string()),
                None,
                "session_no_token".to_string(),
            )
            .await;

        let result = store.create_mcp_token(&session_id).await;
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "No third-party token available for session"
        );
    }

    #[tokio::test]
    async fn test_validate_token_success() {
        let store = create_test_oauth_store();

        // Create a complete flow to get a valid token
        let session_id = store
            .create_auth_session(
                "mcp-client".to_string(),
                Some("profile".to_string()),
                None,
                "token_test_session".to_string(),
            )
            .await;

        let auth_token = AuthToken::new(
            AccessToken::new("third_party_token".to_string()),
            oauth2::basic::BasicTokenType::Bearer,
            EmptyExtraTokenFields {},
        );

        store
            .update_auth_session_token(&session_id, auth_token)
            .await
            .unwrap();
        let mcp_token = store.create_mcp_token(&session_id).await.unwrap();

        // Validate the token
        let result = store.validate_token(&mcp_token.access_token).await;
        assert!(result.is_some());

        let validated_token = result.unwrap();
        assert_eq!(validated_token.access_token, mcp_token.access_token);
        assert_eq!(validated_token.client_id, "mcp-client");
    }

    #[tokio::test]
    async fn test_validate_token_invalid() {
        let store = create_test_oauth_store();

        let result = store.validate_token("invalid_token").await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_mcp_access_token_serialization() {
        let auth_token = AuthToken::new(
            AccessToken::new("test_token".to_string()),
            oauth2::basic::BasicTokenType::Bearer,
            EmptyExtraTokenFields {},
        );

        let mcp_token = McpAccessToken {
            access_token: "mcp-token-123".to_string(),
            token_type: "bearer".to_string(),
            expires_in: Some(3600),
            refresh_token: Some("mcp-refresh-123".to_string()),
            scope: Some("profile email".to_string()),
            auth_token,
            client_id: "test-client".to_string(),
        };

        // Test that it can be serialized to JSON
        let json_result = serde_json::to_string(&mcp_token);
        assert!(json_result.is_ok());

        let json_str = json_result.unwrap();
        assert!(json_str.contains("mcp-token-123"));
        assert!(json_str.contains("bearer"));
        assert!(json_str.contains("3600"));
    }

    #[tokio::test]
    async fn test_auth_session_creation_with_minimal_data() {
        let store = create_test_oauth_store();

        let session_id = store
            .create_auth_session(
                "test-client".to_string(),
                None, // No scope
                None, // No state
                "minimal_session".to_string(),
            )
            .await;

        assert_eq!(session_id, "minimal_session");

        let sessions = store.auth_sessions.read().await;
        let session = sessions.get("minimal_session").unwrap();
        assert_eq!(session.client_id, "test-client");
        assert!(session.scope.is_none());
        assert!(session._state.is_none());
        assert!(session.auth_token.is_none());
    }

    #[tokio::test]
    async fn test_concurrent_access() {
        let store = Arc::new(create_test_oauth_store());

        // Test concurrent session creation
        let mut handles = vec![];
        for i in 0..10 {
            let store_clone = store.clone();
            let handle = tokio::spawn(async move {
                store_clone
                    .create_auth_session(
                        "mcp-client".to_string(),
                        Some("profile".to_string()),
                        None,
                        format!("concurrent_session_{}", i),
                    )
                    .await
            });
            handles.push(handle);
        }

        for handle in handles {
            let session_id = handle.await.unwrap();
            assert!(session_id.starts_with("concurrent_session_"));
        }

        // Verify all sessions were created
        let sessions = store.auth_sessions.read().await;
        assert_eq!(sessions.len(), 10);
    }
    #[test]
    fn test_get_endpoint_address_with_zero_ip() {
        let result = get_endpoint_address("0.0.0.0:8080", Some("192.168.1.100:8080"));
        assert_eq!(result, "192.168.1.100:8080");
    }

    #[test]
    fn test_get_endpoint_address_with_zero_ip_no_port() {
        let result = get_endpoint_address("0.0.0.0", Some("192.168.1.100"));
        assert_eq!(result, "192.168.1.100");
    }

    #[test]
    fn test_get_endpoint_address_with_zero_ip_no_host_header() {
        let result = get_endpoint_address("0.0.0.0:8080", None);
        assert_eq!(result, "localhost:8080");
    }

    #[test]
    fn test_get_endpoint_address_with_specific_ip() {
        let result = get_endpoint_address("192.168.1.100:8080", Some("192.168.1.100:8080"));
        assert_eq!(result, "192.168.1.100:8080");
    }

    #[test]
    fn test_get_endpoint_address_with_localhost() {
        let result = get_endpoint_address("localhost:8080", Some("localhost:8080"));
        assert_eq!(result, "localhost:8080");
    }

    #[test]
    fn test_get_endpoint_address_with_domain() {
        let result = get_endpoint_address("example.com:8080", Some("example.com:8080"));
        assert_eq!(result, "example.com:8080");
    }

    #[tokio::test]
    async fn test_oauth_authorization_server_with_zero_ip() {
        use axum::http::HeaderMap;

        let mut headers = HeaderMap::new();
        headers.insert("host", "192.168.1.100:8080".parse().unwrap());

        let _response = oauth_authorization_server("0.0.0.0:8080", headers).await;

        // This is a basic test to ensure the function doesn't panic
        // In a real test, you'd want to extract and verify the JSON response
        // to ensure the URLs contain "192.168.1.100:8080" instead of "0.0.0.0:8080"
    }
}
