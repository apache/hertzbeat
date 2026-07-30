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

//! OAuth 2.0 authorization-code support for the MCP server.
//!
//! The implementation deliberately keeps the authorization server small, but
//! it still enforces the protocol properties on which bearer-token safety
//! depends: registered redirect URIs, PKCE S256, one-time authorization and
//! consent transactions, expiring codes and tokens, refresh-token rotation,
//! bounded request bodies and registration state, and a configured public
//! issuer URL.

use std::{
    collections::{HashMap, HashSet, VecDeque},
    sync::Arc,
};

use askama::Template;
use axum::{
    Json,
    body::Body,
    extract::{Query, State},
    http::{HeaderValue, Request, StatusCode, header::RETRY_AFTER},
    middleware::Next,
    response::{Html, IntoResponse, Redirect, Response},
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Duration, Utc};
use rand::{Rng, distributions::Alphanumeric};
use rmcp::serde_json::{self, Value};
use rmcp::transport::auth::{
    AuthorizationMetadata, ClientRegistrationRequest, ClientRegistrationResponse,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use tokio::sync::{Mutex, RwLock};
use tracing::{debug, info, warn};
use url::Url;
use uuid::Uuid;

pub const MAX_OAUTH_BODY_BYTES: usize = 16 * 1024;
const AUTH_TRANSACTION_TTL_SECONDS: i64 = 5 * 60;
const AUTHORIZATION_CODE_TTL_SECONDS: i64 = 2 * 60;
const ACCESS_TOKEN_TTL_SECONDS: i64 = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS: i64 = 24 * 60 * 60;
const REGISTERED_CLIENT_IDLE_TTL_SECONDS: i64 = 60 * 60;
const REGISTRATION_RATE_WINDOW_SECONDS: i64 = 60;
const MAX_REGISTRATIONS_PER_WINDOW: usize = 16;
const MAX_CLIENTS: usize = 1_024;
const MAX_AUTH_TRANSACTIONS: usize = 4_096;
const MAX_AUTHORIZATION_CODES: usize = 4_096;
const MAX_ACCESS_TOKENS: usize = 4_096;
const MAX_REFRESH_TOKENS: usize = 4_096;
const SUPPORTED_SCOPES: [&str; 2] = ["profile", "email"];

#[derive(Clone, Debug, PartialEq, Eq)]
enum TokenEndpointAuthMethod {
    None,
    ClientSecretPost,
}

impl TokenEndpointAuthMethod {
    fn parse(value: &str) -> Option<Self> {
        match value {
            "none" => Some(Self::None),
            "client_secret_post" => Some(Self::ClientSecretPost),
            _ => None,
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::None => "none",
            Self::ClientSecretPost => "client_secret_post",
        }
    }
}

#[derive(Clone, Debug)]
struct RegisteredClient {
    client_id: String,
    client_secret: Option<String>,
    redirect_uris: Vec<String>,
    token_endpoint_auth_method: TokenEndpointAuthMethod,
    expires_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
struct AuthorizationTransaction {
    client_id: String,
    redirect_uri: String,
    scope: Option<String>,
    state: Option<String>,
    code_challenge: String,
    consent_nonce: String,
    expires_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
struct AuthorizationCode {
    client_id: String,
    redirect_uri: String,
    scope: Option<String>,
    code_challenge: String,
    expires_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
struct RefreshTokenRecord {
    client_id: String,
    scope: Option<String>,
    expires_at: DateTime<Utc>,
}

/// Access-token state retained by the authorization server.
#[derive(Clone, Debug, Serialize)]
pub struct McpAccessToken {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    pub refresh_token: Option<String>,
    pub scope: Option<String>,
    pub client_id: String,
    #[serde(skip)]
    pub issued_at: DateTime<Utc>,
    #[serde(skip)]
    pub expires_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
struct IssuedTokens {
    access: McpAccessToken,
}

/// Central OAuth state. Every remotely growable map has a hard cardinality
/// bound and is pruned by expiry on the operations that access it.
#[derive(Clone, Debug)]
pub struct McpOAuthStore {
    clients: Arc<RwLock<HashMap<String, RegisteredClient>>>,
    auth_transactions: Arc<RwLock<HashMap<String, AuthorizationTransaction>>>,
    authorization_codes: Arc<RwLock<HashMap<String, AuthorizationCode>>>,
    access_tokens: Arc<RwLock<HashMap<String, McpAccessToken>>>,
    refresh_tokens: Arc<RwLock<HashMap<String, RefreshTokenRecord>>>,
    registration_attempts: Arc<Mutex<VecDeque<DateTime<Utc>>>>,
    approval_secret: Arc<String>,
    public_base_url: Arc<Url>,
}

impl McpOAuthStore {
    /// Create the production store. Clients are registered dynamically; there
    /// is intentionally no repository-known default confidential credential.
    pub fn with_settings(approval_secret: String, public_base_url: Url) -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            auth_transactions: Arc::new(RwLock::new(HashMap::new())),
            authorization_codes: Arc::new(RwLock::new(HashMap::new())),
            access_tokens: Arc::new(RwLock::new(HashMap::new())),
            refresh_tokens: Arc::new(RwLock::new(HashMap::new())),
            registration_attempts: Arc::new(Mutex::new(VecDeque::new())),
            approval_secret: Arc::new(approval_secret),
            public_base_url: Arc::new(public_base_url),
        }
    }

    #[cfg(test)]
    fn new() -> Self {
        let mut store = Self::with_settings(
            generate_random_string(32),
            Url::parse("http://127.0.0.1:4000/").unwrap(),
        );
        let clients = Arc::get_mut(&mut store.clients).unwrap().get_mut();
        clients.insert(
            "public-test-client".to_string(),
            RegisteredClient {
                client_id: "public-test-client".to_string(),
                client_secret: None,
                redirect_uris: vec!["http://127.0.0.1:8080/callback".to_string()],
                token_endpoint_auth_method: TokenEndpointAuthMethod::None,
                expires_at: Utc::now() + Duration::seconds(REGISTERED_CLIENT_IDLE_TTL_SECONDS),
            },
        );
        clients.insert(
            "confidential-test-client".to_string(),
            RegisteredClient {
                client_id: "confidential-test-client".to_string(),
                client_secret: Some("test-only-confidential-secret".to_string()),
                redirect_uris: vec!["https://client.example/callback".to_string()],
                token_endpoint_auth_method: TokenEndpointAuthMethod::ClientSecretPost,
                expires_at: Utc::now() + Duration::seconds(REGISTERED_CLIENT_IDLE_TTL_SECONDS),
            },
        );
        store
    }

    pub fn public_base_url(&self) -> &Url {
        self.public_base_url.as_ref()
    }

    pub fn validate_approval_secret(&self, candidate: &str) -> bool {
        bool::from(self.approval_secret.as_bytes().ct_eq(candidate.as_bytes()))
    }

    async fn validate_client(
        &self,
        client_id: &str,
        redirect_uri: &str,
    ) -> Option<RegisteredClient> {
        let now = Utc::now();
        let mut clients = self.clients.write().await;
        clients.retain(|_, client| client.expires_at > now);
        let client = clients.get(client_id)?;
        client
            .redirect_uris
            .iter()
            .any(|registered| registered == redirect_uri)
            .then(|| client.clone())
    }

    async fn validate_token_client(
        &self,
        client_id: &str,
        client_secret: &str,
    ) -> Option<RegisteredClient> {
        let now = Utc::now();
        let mut clients = self.clients.write().await;
        clients.retain(|_, client| client.expires_at > now);
        let client = clients.get(client_id)?;
        match client.token_endpoint_auth_method {
            TokenEndpointAuthMethod::None => client_secret.is_empty().then(|| client.clone()),
            TokenEndpointAuthMethod::ClientSecretPost => {
                let expected = client.client_secret.as_deref()?;
                bool::from(expected.as_bytes().ct_eq(client_secret.as_bytes()))
                    .then(|| client.clone())
            }
        }
    }

    async fn allow_registration(&self, now: DateTime<Utc>) -> bool {
        let window_start = now - Duration::seconds(REGISTRATION_RATE_WINDOW_SECONDS);
        let mut attempts = self.registration_attempts.lock().await;
        while attempts
            .front()
            .is_some_and(|attempt| *attempt <= window_start)
        {
            attempts.pop_front();
        }
        if attempts.len() >= MAX_REGISTRATIONS_PER_WINDOW {
            return false;
        }
        attempts.push_back(now);
        true
    }

    async fn refresh_client_expiry(&self, client_id: &str, now: DateTime<Utc>) {
        let mut clients = self.clients.write().await;
        if let Some(client) = clients.get_mut(client_id) {
            client.expires_at = now + Duration::seconds(REGISTERED_CLIENT_IDLE_TTL_SECONDS);
        }
    }

    async fn create_authorization_transaction(
        &self,
        params: &AuthorizeQuery,
    ) -> Result<(String, AuthorizationTransaction), OAuthError> {
        if params.response_type != "code" {
            return Err(OAuthError::InvalidRequest(
                "response_type must be code".to_string(),
            ));
        }
        if params.code_challenge_method.as_deref() != Some("S256") {
            return Err(OAuthError::InvalidRequest(
                "code_challenge_method must be S256".to_string(),
            ));
        }
        let code_challenge = params
            .code_challenge
            .as_deref()
            .ok_or_else(|| OAuthError::InvalidRequest("code_challenge is required".to_string()))?;
        if !valid_pkce_challenge(code_challenge) {
            return Err(OAuthError::InvalidRequest(
                "code_challenge is not a valid S256 challenge".to_string(),
            ));
        }
        let client = self
            .validate_client(&params.client_id, &params.redirect_uri)
            .await
            .ok_or_else(|| {
                OAuthError::InvalidRequest("invalid client id or redirect uri".to_string())
            })?;
        let scope = validate_scope(params.scope.as_deref())?;
        debug!(
            "Starting authorization transaction for client {} using {}",
            client.client_id,
            client.token_endpoint_auth_method.as_str()
        );

        let now = Utc::now();
        let mut transactions = self.auth_transactions.write().await;
        transactions.retain(|_, transaction| transaction.expires_at > now);
        if transactions.len() >= MAX_AUTH_TRANSACTIONS {
            return Err(OAuthError::TemporarilyUnavailable);
        }

        let transaction_id = random_prefixed("mcp-auth");
        let transaction = AuthorizationTransaction {
            client_id: params.client_id.clone(),
            redirect_uri: params.redirect_uri.clone(),
            scope,
            state: params.state.clone(),
            code_challenge: code_challenge.to_string(),
            consent_nonce: generate_random_string(48),
            expires_at: now + Duration::seconds(AUTH_TRANSACTION_TTL_SECONDS),
        };
        transactions.insert(transaction_id.clone(), transaction.clone());
        Ok((transaction_id, transaction))
    }

    async fn consume_authorization_transaction(
        &self,
        transaction_id: &str,
        consent_nonce: &str,
    ) -> Result<AuthorizationTransaction, OAuthError> {
        let now = Utc::now();
        let mut transactions = self.auth_transactions.write().await;
        transactions.retain(|_, transaction| transaction.expires_at > now);
        let transaction = transactions
            .get(transaction_id)
            .ok_or(OAuthError::InvalidTransaction)?;
        if !bool::from(
            transaction
                .consent_nonce
                .as_bytes()
                .ct_eq(consent_nonce.as_bytes()),
        ) {
            return Err(OAuthError::InvalidTransaction);
        }
        transactions
            .remove(transaction_id)
            .ok_or(OAuthError::InvalidTransaction)
    }

    async fn create_authorization_code(
        &self,
        transaction: AuthorizationTransaction,
    ) -> Result<String, OAuthError> {
        let now = Utc::now();
        let mut codes = self.authorization_codes.write().await;
        codes.retain(|_, code| code.expires_at > now);
        if codes.len() >= MAX_AUTHORIZATION_CODES {
            return Err(OAuthError::TemporarilyUnavailable);
        }
        let code_value = random_prefixed("mcp-code");
        codes.insert(
            code_value.clone(),
            AuthorizationCode {
                client_id: transaction.client_id,
                redirect_uri: transaction.redirect_uri,
                scope: transaction.scope,
                code_challenge: transaction.code_challenge,
                expires_at: now + Duration::seconds(AUTHORIZATION_CODE_TTL_SECONDS),
            },
        );
        Ok(code_value)
    }

    async fn exchange_authorization_code(
        &self,
        request: &TokenRequest,
    ) -> Result<IssuedTokens, OAuthError> {
        self.validate_token_client(&request.client_id, &request.client_secret)
            .await
            .ok_or(OAuthError::InvalidClient)?;

        let now = Utc::now();
        let mut codes = self.authorization_codes.write().await;
        codes.retain(|_, code| code.expires_at > now);
        let code = codes
            .get(&request.code)
            .cloned()
            .ok_or(OAuthError::InvalidGrant)?;
        if code.client_id != request.client_id || code.redirect_uri != request.redirect_uri {
            return Err(OAuthError::InvalidGrant);
        }
        let verifier = request
            .code_verifier
            .as_deref()
            .ok_or(OAuthError::InvalidGrant)?;
        if !pkce_matches(verifier, &code.code_challenge) {
            // A verifier failure consumes the code so it cannot become a
            // brute-force oracle.
            codes.remove(&request.code);
            return Err(OAuthError::InvalidGrant);
        }
        let code = codes
            .remove(&request.code)
            .ok_or(OAuthError::InvalidGrant)?;
        drop(codes);

        self.refresh_client_expiry(&code.client_id, now).await;
        self.issue_tokens(code.client_id, code.scope).await
    }

    async fn exchange_refresh_token(
        &self,
        request: &TokenRequest,
    ) -> Result<IssuedTokens, OAuthError> {
        self.validate_token_client(&request.client_id, &request.client_secret)
            .await
            .ok_or(OAuthError::InvalidClient)?;

        let now = Utc::now();
        let mut refresh_tokens = self.refresh_tokens.write().await;
        refresh_tokens.retain(|_, token| token.expires_at > now);
        let record = refresh_tokens
            .get(&request.refresh_token)
            .cloned()
            .ok_or(OAuthError::InvalidGrant)?;
        if record.client_id != request.client_id {
            return Err(OAuthError::InvalidGrant);
        }
        let record = refresh_tokens
            .remove(&request.refresh_token)
            .ok_or(OAuthError::InvalidGrant)?;
        drop(refresh_tokens);

        self.refresh_client_expiry(&record.client_id, now).await;
        self.issue_tokens(record.client_id, record.scope).await
    }

    async fn issue_tokens(
        &self,
        client_id: String,
        scope: Option<String>,
    ) -> Result<IssuedTokens, OAuthError> {
        let now = Utc::now();
        let access_token_value = random_prefixed("mcp-token");
        let refresh_token_value = random_prefixed("mcp-refresh");
        let access = McpAccessToken {
            access_token: access_token_value.clone(),
            token_type: "bearer".to_string(),
            expires_in: ACCESS_TOKEN_TTL_SECONDS as u64,
            refresh_token: Some(refresh_token_value.clone()),
            scope: scope.clone(),
            client_id: client_id.clone(),
            issued_at: now,
            expires_at: now + Duration::seconds(ACCESS_TOKEN_TTL_SECONDS),
        };

        let mut access_tokens = self.access_tokens.write().await;
        access_tokens.retain(|_, token| token.expires_at > now);
        if access_tokens.len() >= MAX_ACCESS_TOKENS {
            return Err(OAuthError::TemporarilyUnavailable);
        }
        let mut refresh_tokens = self.refresh_tokens.write().await;
        refresh_tokens.retain(|_, token| token.expires_at > now);
        if refresh_tokens.len() >= MAX_REFRESH_TOKENS {
            return Err(OAuthError::TemporarilyUnavailable);
        }
        access_tokens.insert(access_token_value, access.clone());
        refresh_tokens.insert(
            refresh_token_value,
            RefreshTokenRecord {
                client_id,
                scope,
                expires_at: now + Duration::seconds(REFRESH_TOKEN_TTL_SECONDS),
            },
        );
        Ok(IssuedTokens { access })
    }

    /// Validate a bearer token and atomically discard it after expiry.
    pub async fn validate_token(&self, token: &str) -> Option<McpAccessToken> {
        let now = Utc::now();
        let mut tokens = self.access_tokens.write().await;
        let current = tokens.get(token)?.clone();
        if current.expires_at <= now || current.issued_at > now {
            tokens.remove(token);
            None
        } else {
            Some(current)
        }
    }
}

#[derive(Debug)]
enum OAuthError {
    InvalidRequest(String),
    InvalidClient,
    InvalidGrant,
    InvalidTransaction,
    RateLimited,
    TemporarilyUnavailable,
}

impl OAuthError {
    fn response(&self) -> Response {
        match self {
            Self::InvalidRequest(description) => {
                oauth_json_error(StatusCode::BAD_REQUEST, "invalid_request", description)
            }
            Self::InvalidClient => oauth_json_error(
                StatusCode::UNAUTHORIZED,
                "invalid_client",
                "client authentication failed",
            ),
            Self::InvalidGrant => oauth_json_error(
                StatusCode::BAD_REQUEST,
                "invalid_grant",
                "authorization grant is invalid, expired, or already used",
            ),
            Self::InvalidTransaction => oauth_json_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "authorization transaction is invalid, expired, or already used",
            ),
            Self::RateLimited => {
                let mut response = oauth_json_error(
                    StatusCode::TOO_MANY_REQUESTS,
                    "temporarily_unavailable",
                    "client registration rate limit exceeded",
                );
                response
                    .headers_mut()
                    .insert(RETRY_AFTER, HeaderValue::from_static("60"));
                response
            }
            Self::TemporarilyUnavailable => oauth_json_error(
                StatusCode::SERVICE_UNAVAILABLE,
                "temporarily_unavailable",
                "authorization server capacity is temporarily exhausted",
            ),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct AuthorizeQuery {
    pub response_type: String,
    pub client_id: String,
    pub redirect_uri: String,
    pub scope: Option<String>,
    pub state: Option<String>,
    pub code_challenge: Option<String>,
    pub code_challenge_method: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
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

#[derive(Template)]
#[template(path = "mcp_oauth_authorize.html")]
pub struct OAuthAuthorizeTemplate {
    pub client_id: String,
    pub scopes: String,
    pub transaction_id: String,
    pub consent_nonce: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ApprovalForm {
    pub transaction_id: String,
    pub consent_nonce: String,
    pub approved: String,
    #[serde(default)]
    pub approval_secret: String,
}

pub fn generate_random_string(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

fn random_prefixed(prefix: &str) -> String {
    format!("{prefix}-{}-{}", Uuid::new_v4(), generate_random_string(24))
}

fn validate_scope(scope: Option<&str>) -> Result<Option<String>, OAuthError> {
    let Some(scope) = scope.map(str::trim).filter(|scope| !scope.is_empty()) else {
        return Ok(None);
    };
    let requested: HashSet<&str> = scope.split_whitespace().collect();
    if requested
        .iter()
        .any(|requested| !SUPPORTED_SCOPES.contains(requested))
    {
        return Err(OAuthError::InvalidRequest(
            "requested scope is not supported".to_string(),
        ));
    }
    let normalized = SUPPORTED_SCOPES
        .iter()
        .filter(|supported| requested.contains(**supported))
        .copied()
        .collect::<Vec<_>>()
        .join(" ");
    Ok(Some(normalized))
}

fn valid_pkce_challenge(challenge: &str) -> bool {
    challenge.len() == 43
        && challenge
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
}

fn valid_pkce_verifier(verifier: &str) -> bool {
    (43..=128).contains(&verifier.len())
        && verifier
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~'))
}

fn pkce_matches(verifier: &str, expected_challenge: &str) -> bool {
    if !valid_pkce_verifier(verifier) {
        return false;
    }
    let actual = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    bool::from(actual.as_bytes().ct_eq(expected_challenge.as_bytes()))
}

fn redirect_with_params(redirect_uri: &str, params: &[(&str, &str)]) -> Result<String, OAuthError> {
    let mut url = Url::parse(redirect_uri)
        .map_err(|_| OAuthError::InvalidRequest("invalid redirect uri".to_string()))?;
    {
        let mut query = url.query_pairs_mut();
        for (key, value) in params {
            if !value.is_empty() {
                query.append_pair(key, value);
            }
        }
    }
    Ok(url.into())
}

pub fn validate_redirect_uri(value: &str) -> bool {
    let Ok(url) = Url::parse(value) else {
        return false;
    };
    if !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
        || url.host_str().is_none()
    {
        return false;
    }
    if url.scheme() == "https" {
        return true;
    }
    url.scheme() == "http" && matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1"))
}

pub fn validate_public_base_url(value: &str, require_https: bool) -> Result<Url, String> {
    let mut url = Url::parse(value).map_err(|_| "public base URL is invalid".to_string())?;
    if !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || url.host_str().is_none()
    {
        return Err("public base URL must not contain credentials, query, or fragment".to_string());
    }
    if require_https && url.scheme() != "https" {
        return Err("public base URL must use https in production".to_string());
    }
    if !matches!(url.scheme(), "http" | "https") {
        return Err("public base URL must use http or https".to_string());
    }
    if !matches!(url.path(), "" | "/") {
        return Err("public base URL must not contain a path".to_string());
    }
    url.set_path("/");
    Ok(url)
}

async fn read_limited_body(request: Request<Body>) -> Result<Vec<u8>, Response> {
    match axum::body::to_bytes(request.into_body(), MAX_OAUTH_BODY_BYTES).await {
        Ok(bytes) => Ok(bytes.to_vec()),
        Err(_) => Err(oauth_json_error(
            StatusCode::PAYLOAD_TOO_LARGE,
            "invalid_request",
            "request body exceeds the authorization endpoint limit",
        )),
    }
}

fn oauth_json_error(status: StatusCode, error: &str, description: &str) -> Response {
    (
        status,
        Json(serde_json::json!({
            "error": error,
            "error_description": description
        })),
    )
        .into_response()
}

pub async fn oauth_authorize(
    Query(params): Query<AuthorizeQuery>,
    State(state): State<Arc<McpOAuthStore>>,
) -> Response {
    let (transaction_id, transaction) = match state.create_authorization_transaction(&params).await
    {
        Ok(created) => created,
        Err(error) => return error.response(),
    };
    let template = OAuthAuthorizeTemplate {
        client_id: transaction.client_id,
        scopes: transaction
            .scope
            .unwrap_or_else(|| "No additional scopes".to_string()),
        transaction_id,
        consent_nonce: transaction.consent_nonce,
    };
    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => oauth_json_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "server_error",
            "authorization page could not be rendered",
        ),
    }
}

pub async fn oauth_approve(
    State(state): State<Arc<McpOAuthStore>>,
    request: Request<Body>,
) -> Response {
    let bytes = match read_limited_body(request).await {
        Ok(bytes) => bytes,
        Err(response) => return response,
    };
    let form = match serde_urlencoded::from_bytes::<ApprovalForm>(&bytes) {
        Ok(form) => form,
        Err(_) => {
            return oauth_json_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "approval form is invalid",
            );
        }
    };
    if !state.validate_approval_secret(&form.approval_secret) {
        warn!("Rejected OAuth approval with an invalid resource-owner credential");
        return oauth_json_error(
            StatusCode::UNAUTHORIZED,
            "access_denied",
            "approval authentication failed",
        );
    }
    let transaction = match state
        .consume_authorization_transaction(&form.transaction_id, &form.consent_nonce)
        .await
    {
        Ok(transaction) => transaction,
        Err(error) => return error.response(),
    };

    if form.approved != "true" {
        let mut params = vec![
            ("error", "access_denied"),
            (
                "error_description",
                "user rejected the authorization request",
            ),
        ];
        if let Some(state) = transaction.state.as_deref() {
            params.push(("state", state));
        }
        return match redirect_with_params(&transaction.redirect_uri, &params) {
            Ok(url) => Redirect::to(&url).into_response(),
            Err(error) => error.response(),
        };
    }

    let state_value = transaction.state.clone();
    let redirect_uri = transaction.redirect_uri.clone();
    let client_id = transaction.client_id.clone();
    let code = match state.create_authorization_code(transaction).await {
        Ok(code) => code,
        Err(error) => return error.response(),
    };
    let mut params = vec![("code", code.as_str())];
    if let Some(value) = state_value.as_deref() {
        params.push(("state", value));
    }
    info!("Authorization approved for client {}", client_id);
    match redirect_with_params(&redirect_uri, &params) {
        Ok(url) => Redirect::to(&url).into_response(),
        Err(error) => error.response(),
    }
}

pub async fn oauth_token(
    State(state): State<Arc<McpOAuthStore>>,
    request: Request<Body>,
) -> Response {
    let bytes = match read_limited_body(request).await {
        Ok(bytes) => bytes,
        Err(response) => return response,
    };
    let request = match serde_urlencoded::from_bytes::<TokenRequest>(&bytes) {
        Ok(request) => request,
        Err(_) => {
            return oauth_json_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "token request is invalid",
            );
        }
    };
    if request.client_id.is_empty() {
        return OAuthError::InvalidClient.response();
    }
    let issued = match request.grant_type.as_str() {
        "authorization_code" => state.exchange_authorization_code(&request).await,
        "refresh_token" => state.exchange_refresh_token(&request).await,
        _ => {
            return oauth_json_error(
                StatusCode::BAD_REQUEST,
                "unsupported_grant_type",
                "authorization_code and refresh_token are supported",
            );
        }
    };
    match issued {
        Ok(issued) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "access_token": issued.access.access_token,
                "token_type": issued.access.token_type,
                "expires_in": issued.access.expires_in,
                "refresh_token": issued.access.refresh_token,
                "scope": issued.access.scope,
            })),
        )
            .into_response(),
        Err(error) => error.response(),
    }
}

pub async fn validate_token_middleware(
    State(token_store): State<Arc<McpOAuthStore>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let Some(token) = request
        .headers()
        .get("Authorization")
        .and_then(|header| header.to_str().ok())
        .and_then(|header| header.strip_prefix("Bearer "))
    else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    match token_store.validate_token(token).await {
        Some(_) => next.run(request).await,
        None => StatusCode::UNAUTHORIZED.into_response(),
    }
}

pub async fn oauth_authorization_server(
    State(state): State<Arc<McpOAuthStore>>,
) -> impl IntoResponse {
    let base = state.public_base_url();
    let endpoint = |path: &str| {
        base.join(path)
            .expect("validated public base URL")
            .to_string()
    };
    let mut additional_fields = HashMap::new();
    additional_fields.insert(
        "response_types_supported".into(),
        Value::Array(vec![Value::String("code".into())]),
    );
    additional_fields.insert(
        "code_challenge_methods_supported".into(),
        Value::Array(vec![Value::String("S256".into())]),
    );
    additional_fields.insert(
        "grant_types_supported".into(),
        Value::Array(vec![
            Value::String("authorization_code".into()),
            Value::String("refresh_token".into()),
        ]),
    );
    additional_fields.insert(
        "token_endpoint_auth_methods_supported".into(),
        Value::Array(vec![
            Value::String("none".into()),
            Value::String("client_secret_post".into()),
        ]),
    );
    let issuer = base.as_str().trim_end_matches('/').to_string();
    (
        StatusCode::OK,
        Json(AuthorizationMetadata {
            authorization_endpoint: endpoint("authorize"),
            token_endpoint: endpoint("token"),
            registration_endpoint: endpoint("register"),
            issuer: Some(issuer),
            jwks_uri: None,
            scopes_supported: Some(SUPPORTED_SCOPES.iter().map(ToString::to_string).collect()),
            additional_fields,
        }),
    )
}

pub async fn oauth_register(
    State(state): State<Arc<McpOAuthStore>>,
    request: Request<Body>,
) -> Response {
    let bytes = match read_limited_body(request).await {
        Ok(bytes) => bytes,
        Err(response) => return response,
    };
    let request = match serde_json::from_slice::<ClientRegistrationRequest>(&bytes) {
        Ok(request) => request,
        Err(_) => {
            return oauth_json_error(
                StatusCode::BAD_REQUEST,
                "invalid_client_metadata",
                "registration request is invalid",
            );
        }
    };
    if request.client_name.trim().is_empty() || request.client_name.len() > 100 {
        return oauth_json_error(
            StatusCode::BAD_REQUEST,
            "invalid_client_metadata",
            "client_name must contain between 1 and 100 characters",
        );
    }
    if request.redirect_uris.is_empty()
        || request.redirect_uris.len() > 10
        || request
            .redirect_uris
            .iter()
            .any(|uri| !validate_redirect_uri(uri))
    {
        return oauth_json_error(
            StatusCode::BAD_REQUEST,
            "invalid_redirect_uri",
            "redirect URIs must use HTTPS or an HTTP loopback address",
        );
    }
    if !request
        .grant_types
        .iter()
        .any(|grant| grant == "authorization_code")
        || request
            .grant_types
            .iter()
            .any(|grant| !matches!(grant.as_str(), "authorization_code" | "refresh_token"))
        || !request
            .response_types
            .iter()
            .any(|response| response == "code")
        || request
            .response_types
            .iter()
            .any(|response| response != "code")
    {
        return oauth_json_error(
            StatusCode::BAD_REQUEST,
            "invalid_client_metadata",
            "only authorization_code, optional refresh_token, and code response are supported",
        );
    }
    let Some(auth_method) = TokenEndpointAuthMethod::parse(&request.token_endpoint_auth_method)
    else {
        return oauth_json_error(
            StatusCode::BAD_REQUEST,
            "invalid_client_metadata",
            "token_endpoint_auth_method must be none or client_secret_post",
        );
    };

    let client_id = random_prefixed("client");
    let client_secret = (auth_method == TokenEndpointAuthMethod::ClientSecretPost)
        .then(|| generate_random_string(48));
    let now = Utc::now();
    if !state.allow_registration(now).await {
        return OAuthError::RateLimited.response();
    }
    let mut clients = state.clients.write().await;
    clients.retain(|_, client| client.expires_at > now);
    if clients.len() >= MAX_CLIENTS {
        return OAuthError::TemporarilyUnavailable.response();
    }
    let mut unique_redirects = Vec::new();
    for redirect in &request.redirect_uris {
        if !unique_redirects.contains(redirect) {
            unique_redirects.push(redirect.clone());
        }
    }
    clients.insert(
        client_id.clone(),
        RegisteredClient {
            client_id: client_id.clone(),
            client_secret: client_secret.clone(),
            redirect_uris: unique_redirects.clone(),
            token_endpoint_auth_method: auth_method.clone(),
            expires_at: now + Duration::seconds(REGISTERED_CLIENT_IDLE_TTL_SECONDS),
        },
    );
    drop(clients);

    let mut additional_fields = HashMap::new();
    additional_fields.insert(
        "token_endpoint_auth_method".to_string(),
        Value::String(auth_method.as_str().to_string()),
    );
    additional_fields.insert(
        "grant_types".to_string(),
        serde_json::json!(request.grant_types),
    );
    additional_fields.insert(
        "response_types".to_string(),
        serde_json::json!(request.response_types),
    );
    (
        StatusCode::CREATED,
        Json(ClientRegistrationResponse {
            client_id,
            client_secret,
            client_name: request.client_name,
            redirect_uris: unique_redirects,
            additional_fields,
        }),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;

    const VERIFIER: &str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";

    fn challenge() -> String {
        URL_SAFE_NO_PAD.encode(Sha256::digest(VERIFIER.as_bytes()))
    }

    fn authorize_query(client_id: &str, redirect_uri: &str) -> AuthorizeQuery {
        AuthorizeQuery {
            response_type: "code".to_string(),
            client_id: client_id.to_string(),
            redirect_uri: redirect_uri.to_string(),
            scope: Some("email profile".to_string()),
            state: Some("state with reserved & characters".to_string()),
            code_challenge: Some(challenge()),
            code_challenge_method: Some("S256".to_string()),
        }
    }

    async fn approve_transaction(store: &Arc<McpOAuthStore>, query: AuthorizeQuery) -> String {
        let (transaction_id, transaction) = store
            .create_authorization_transaction(&query)
            .await
            .unwrap();
        let body = serde_urlencoded::to_string(ApprovalForm {
            transaction_id,
            consent_nonce: transaction.consent_nonce,
            approved: "true".to_string(),
            approval_secret: store.approval_secret.as_ref().clone(),
        })
        .unwrap();
        let response = oauth_approve(
            State(store.clone()),
            Request::builder().body(Body::from(body)).unwrap(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::SEE_OTHER);
        let location = response
            .headers()
            .get("location")
            .unwrap()
            .to_str()
            .unwrap();
        let redirect = Url::parse(location).unwrap();
        assert_eq!(
            redirect
                .query_pairs()
                .find(|(key, _)| key == "state")
                .unwrap()
                .1,
            "state with reserved & characters"
        );
        redirect
            .query_pairs()
            .find(|(key, _)| key == "code")
            .unwrap()
            .1
            .into_owned()
    }

    async fn token_request(store: Arc<McpOAuthStore>, request: TokenRequest) -> Response {
        oauth_token(
            State(store),
            Request::builder()
                .body(Body::from(serde_urlencoded::to_string(request).unwrap()))
                .unwrap(),
        )
        .await
    }

    #[tokio::test]
    async fn public_client_completes_pkce_flow_and_code_is_single_use() {
        let store = Arc::new(McpOAuthStore::new());
        let code = approve_transaction(
            &store,
            authorize_query("public-test-client", "http://127.0.0.1:8080/callback"),
        )
        .await;
        let request = TokenRequest {
            grant_type: "authorization_code".to_string(),
            code,
            client_id: "public-test-client".to_string(),
            client_secret: String::new(),
            redirect_uri: "http://127.0.0.1:8080/callback".to_string(),
            code_verifier: Some(VERIFIER.to_string()),
            refresh_token: String::new(),
        };
        let first = token_request(store.clone(), request.clone()).await;
        assert_eq!(first.status(), StatusCode::OK);
        let replay = token_request(store, request).await;
        assert_eq!(replay.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn incorrect_pkce_verifier_is_rejected_and_consumes_code() {
        let store = Arc::new(McpOAuthStore::new());
        let code = approve_transaction(
            &store,
            authorize_query("public-test-client", "http://127.0.0.1:8080/callback"),
        )
        .await;
        let mut request = TokenRequest {
            grant_type: "authorization_code".to_string(),
            code,
            client_id: "public-test-client".to_string(),
            client_secret: String::new(),
            redirect_uri: "http://127.0.0.1:8080/callback".to_string(),
            code_verifier: Some(format!("{VERIFIER}x")),
            refresh_token: String::new(),
        };
        assert_eq!(
            token_request(store.clone(), request.clone()).await.status(),
            StatusCode::BAD_REQUEST
        );
        request.code_verifier = Some(VERIFIER.to_string());
        assert_eq!(
            token_request(store, request).await.status(),
            StatusCode::BAD_REQUEST
        );
    }

    #[tokio::test]
    async fn confidential_client_requires_its_generated_auth_semantics() {
        let store = Arc::new(McpOAuthStore::new());
        let code = approve_transaction(
            &store,
            authorize_query(
                "confidential-test-client",
                "https://client.example/callback",
            ),
        )
        .await;
        let mut request = TokenRequest {
            grant_type: "authorization_code".to_string(),
            code,
            client_id: "confidential-test-client".to_string(),
            client_secret: "wrong".to_string(),
            redirect_uri: "https://client.example/callback".to_string(),
            code_verifier: Some(VERIFIER.to_string()),
            refresh_token: String::new(),
        };
        assert_eq!(
            token_request(store.clone(), request.clone()).await.status(),
            StatusCode::UNAUTHORIZED
        );
        request.client_secret = "test-only-confidential-secret".to_string();
        assert_eq!(token_request(store, request).await.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn refresh_token_rotates_and_old_value_cannot_be_replayed() {
        let store = Arc::new(McpOAuthStore::new());
        let issued = store
            .issue_tokens(
                "public-test-client".to_string(),
                Some("profile".to_string()),
            )
            .await
            .unwrap();
        let refresh_token = issued.access.refresh_token.unwrap();
        let request = TokenRequest {
            grant_type: "refresh_token".to_string(),
            code: String::new(),
            client_id: "public-test-client".to_string(),
            client_secret: String::new(),
            redirect_uri: String::new(),
            code_verifier: None,
            refresh_token,
        };
        assert_eq!(
            token_request(store.clone(), request.clone()).await.status(),
            StatusCode::OK
        );
        assert_eq!(
            token_request(store, request).await.status(),
            StatusCode::BAD_REQUEST
        );
    }

    #[tokio::test]
    async fn expired_access_token_is_removed() {
        let store = McpOAuthStore::new();
        let token = McpAccessToken {
            access_token: "expired-token".to_string(),
            token_type: "bearer".to_string(),
            expires_in: 0,
            refresh_token: None,
            scope: None,
            client_id: "public-test-client".to_string(),
            issued_at: Utc::now() - Duration::hours(2),
            expires_at: Utc::now() - Duration::hours(1),
        };
        store
            .access_tokens
            .write()
            .await
            .insert(token.access_token.clone(), token);

        assert!(store.validate_token("expired-token").await.is_none());
        assert!(store.access_tokens.read().await.is_empty());
    }

    #[tokio::test]
    async fn authorization_code_and_transaction_expiry_are_enforced() {
        let store = Arc::new(McpOAuthStore::new());
        let query = authorize_query("public-test-client", "http://127.0.0.1:8080/callback");
        let (transaction_id, transaction) = store
            .create_authorization_transaction(&query)
            .await
            .unwrap();
        store
            .auth_transactions
            .write()
            .await
            .get_mut(&transaction_id)
            .unwrap()
            .expires_at = Utc::now() - Duration::seconds(1);
        assert!(
            store
                .consume_authorization_transaction(&transaction_id, &transaction.consent_nonce)
                .await
                .is_err()
        );

        let code = store
            .create_authorization_code(AuthorizationTransaction {
                expires_at: Utc::now() + Duration::minutes(1),
                ..transaction
            })
            .await
            .unwrap();
        store
            .authorization_codes
            .write()
            .await
            .get_mut(&code)
            .unwrap()
            .expires_at = Utc::now() - Duration::seconds(1);
        let request = TokenRequest {
            grant_type: "authorization_code".to_string(),
            code,
            client_id: "public-test-client".to_string(),
            client_secret: String::new(),
            redirect_uri: "http://127.0.0.1:8080/callback".to_string(),
            code_verifier: Some(VERIFIER.to_string()),
            refresh_token: String::new(),
        };
        assert_eq!(
            token_request(store, request).await.status(),
            StatusCode::BAD_REQUEST
        );
    }

    #[tokio::test]
    async fn approval_requires_bound_nonce_and_is_single_use() {
        let store = Arc::new(McpOAuthStore::new());
        let (transaction_id, transaction) = store
            .create_authorization_transaction(&authorize_query(
                "public-test-client",
                "http://127.0.0.1:8080/callback",
            ))
            .await
            .unwrap();
        let invalid_body = serde_urlencoded::to_string(ApprovalForm {
            transaction_id: transaction_id.clone(),
            consent_nonce: "attacker-controlled".to_string(),
            approved: "true".to_string(),
            approval_secret: store.approval_secret.as_ref().clone(),
        })
        .unwrap();
        assert_eq!(
            oauth_approve(
                State(store.clone()),
                Request::builder().body(Body::from(invalid_body)).unwrap()
            )
            .await
            .status(),
            StatusCode::BAD_REQUEST
        );

        let valid_body = serde_urlencoded::to_string(ApprovalForm {
            transaction_id,
            consent_nonce: transaction.consent_nonce,
            approved: "true".to_string(),
            approval_secret: store.approval_secret.as_ref().clone(),
        })
        .unwrap();
        let first = oauth_approve(
            State(store.clone()),
            Request::builder()
                .body(Body::from(valid_body.clone()))
                .unwrap(),
        )
        .await;
        assert_eq!(first.status(), StatusCode::SEE_OTHER);
        let replay = oauth_approve(
            State(store),
            Request::builder().body(Body::from(valid_body)).unwrap(),
        )
        .await;
        assert_eq!(replay.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn token_and_approval_endpoints_reject_oversized_bodies() {
        let store = Arc::new(McpOAuthStore::new());
        let oversized = "x".repeat(MAX_OAUTH_BODY_BYTES + 1);
        assert_eq!(
            oauth_token(
                State(store.clone()),
                Request::builder()
                    .body(Body::from(oversized.clone()))
                    .unwrap()
            )
            .await
            .status(),
            StatusCode::PAYLOAD_TOO_LARGE
        );
        assert_eq!(
            oauth_approve(
                State(store),
                Request::builder().body(Body::from(oversized)).unwrap()
            )
            .await
            .status(),
            StatusCode::PAYLOAD_TOO_LARGE
        );
    }

    #[tokio::test]
    async fn authorize_validates_response_scope_redirect_and_pkce() {
        let store = Arc::new(McpOAuthStore::new());
        let mut query = authorize_query("public-test-client", "http://127.0.0.1:8080/callback");
        query.response_type = "token".to_string();
        assert_eq!(
            oauth_authorize(Query(query), State(store.clone()))
                .await
                .status(),
            StatusCode::BAD_REQUEST
        );

        let mut query = authorize_query("public-test-client", "http://127.0.0.1:8080/callback");
        query.scope = Some("admin".to_string());
        assert_eq!(
            oauth_authorize(Query(query), State(store.clone()))
                .await
                .status(),
            StatusCode::BAD_REQUEST
        );

        let mut query = authorize_query("public-test-client", "https://attacker.example/callback");
        query.code_challenge = None;
        assert_eq!(
            oauth_authorize(Query(query), State(store)).await.status(),
            StatusCode::BAD_REQUEST
        );
    }

    #[tokio::test]
    async fn dynamic_registration_distinguishes_public_and_confidential_clients() {
        let store = Arc::new(McpOAuthStore::new());
        let public = ClientRegistrationRequest {
            client_name: "public".to_string(),
            redirect_uris: vec!["http://127.0.0.1:9911/callback".to_string()],
            grant_types: vec![
                "authorization_code".to_string(),
                "refresh_token".to_string(),
            ],
            token_endpoint_auth_method: "none".to_string(),
            response_types: vec!["code".to_string()],
        };
        let response = oauth_register(
            State(store.clone()),
            Request::builder()
                .body(Body::from(serde_json::to_vec(&public).unwrap()))
                .unwrap(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::CREATED);
        let body = to_bytes(response.into_body(), MAX_OAUTH_BODY_BYTES)
            .await
            .unwrap();
        let registered: ClientRegistrationResponse = serde_json::from_slice(&body).unwrap();
        assert!(registered.client_secret.is_none());

        let confidential = ClientRegistrationRequest {
            token_endpoint_auth_method: "client_secret_post".to_string(),
            ..public
        };
        let response = oauth_register(
            State(store),
            Request::builder()
                .body(Body::from(serde_json::to_vec(&confidential).unwrap()))
                .unwrap(),
        )
        .await;
        let body = to_bytes(response.into_body(), MAX_OAUTH_BODY_BYTES)
            .await
            .unwrap();
        let registered: ClientRegistrationResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(registered.client_secret.unwrap().len(), 48);
    }

    #[tokio::test]
    async fn dynamic_registration_is_rate_limited_before_client_capacity_is_exhausted() {
        assert!(
            MAX_REGISTRATIONS_PER_WINDOW
                * ((REGISTERED_CLIENT_IDLE_TTL_SECONDS / REGISTRATION_RATE_WINDOW_SECONDS)
                    as usize)
                < MAX_CLIENTS
        );
        let store = Arc::new(McpOAuthStore::new());
        let registration = ClientRegistrationRequest {
            client_name: "bounded-client".to_string(),
            redirect_uris: vec!["http://127.0.0.1:9911/callback".to_string()],
            grant_types: vec!["authorization_code".to_string()],
            token_endpoint_auth_method: "none".to_string(),
            response_types: vec!["code".to_string()],
        };

        for _ in 0..MAX_REGISTRATIONS_PER_WINDOW {
            let response = oauth_register(
                State(store.clone()),
                Request::builder()
                    .body(Body::from(serde_json::to_vec(&registration).unwrap()))
                    .unwrap(),
            )
            .await;
            assert_eq!(response.status(), StatusCode::CREATED);
        }

        let limited = oauth_register(
            State(store),
            Request::builder()
                .body(Body::from(serde_json::to_vec(&registration).unwrap()))
                .unwrap(),
        )
        .await;
        assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(
            limited.headers().get(RETRY_AFTER),
            Some(&HeaderValue::from_static("60"))
        );
    }

    #[tokio::test]
    async fn expired_dynamic_clients_are_pruned_before_the_capacity_check() {
        let store = Arc::new(McpOAuthStore::new());
        let mut clients = store.clients.write().await;
        let template = clients.get("public-test-client").unwrap().clone();
        clients.clear();
        for index in 0..MAX_CLIENTS {
            clients.insert(
                format!("expired-{index}"),
                RegisteredClient {
                    client_id: format!("expired-{index}"),
                    expires_at: Utc::now() - Duration::seconds(1),
                    ..template.clone()
                },
            );
        }
        drop(clients);

        let registration = ClientRegistrationRequest {
            client_name: "replacement-client".to_string(),
            redirect_uris: vec!["http://127.0.0.1:9911/callback".to_string()],
            grant_types: vec!["authorization_code".to_string()],
            token_endpoint_auth_method: "none".to_string(),
            response_types: vec!["code".to_string()],
        };
        let response = oauth_register(
            State(store.clone()),
            Request::builder()
                .body(Body::from(serde_json::to_vec(&registration).unwrap()))
                .unwrap(),
        )
        .await;

        assert_eq!(response.status(), StatusCode::CREATED);
        let clients = store.clients.read().await;
        assert_eq!(clients.len(), 1);
        assert!(
            clients
                .values()
                .all(|client| client.expires_at > Utc::now())
        );
    }

    #[test]
    fn redirect_and_public_base_urls_have_safe_schemes_and_shapes() {
        assert!(validate_redirect_uri("https://client.example/callback"));
        assert!(validate_redirect_uri("http://127.0.0.1:8080/callback"));
        assert!(!validate_redirect_uri("http://client.example/callback"));
        assert!(!validate_redirect_uri(
            "https://user:password@client.example/callback"
        ));
        assert!(validate_public_base_url("https://mcp.example/", true).is_ok());
        assert!(validate_public_base_url("http://mcp.example/", true).is_err());
        assert!(validate_public_base_url("https://mcp.example/path?query=1", true).is_err());
    }
}
