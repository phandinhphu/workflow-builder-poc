/**
 * Credential Management Types
 * Section 7.9 - Secure credential storage and reference
 * 
 * Never store secrets in workflow definition or logs
 */

export type CredentialType =
  | 'API_KEY'
  | 'BEARER_TOKEN'
  | 'BASIC_AUTH'
  | 'OAUTH2'
  | 'SSH_KEY'
  | 'CERTIFICATE'
  | 'CUSTOM';

export interface CredentialDefinition {
  id: string;
  name: string;
  type: CredentialType;
  description?: string;
  scope: 'GLOBAL' | 'WORKFLOW' | 'USER';
  encryptedData: string; // Encrypted credential data
  metadata: CredentialMetadata;
  expiresAt?: string;
  rotationPolicy?: RotationPolicy;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastUsedAt?: string;
}

export interface CredentialMetadata {
  connectorTypes?: string[]; // Which connector types can use this
  environment?: 'DEV' | 'STAGING' | 'PRODUCTION';
  owner?: string;
  team?: string;
  [key: string]: unknown;
}

export interface RotationPolicy {
  enabled: boolean;
  rotationIntervalDays: number;
  notifyBeforeDays: number;
  autoRotate: boolean;
}

// Credential data structures (before encryption)
export interface ApiKeyCredential {
  type: 'API_KEY';
  apiKey: string;
  headerName?: string; // Default: 'X-API-Key'
}

export interface BearerTokenCredential {
  type: 'BEARER_TOKEN';
  token: string;
}

export interface BasicAuthCredential {
  type: 'BASIC_AUTH';
  username: string;
  password: string;
}

export interface OAuth2Credential {
  type: 'OAUTH2';
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl?: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface SshKeyCredential {
  type: 'SSH_KEY';
  privateKey: string;
  passphrase?: string;
  publicKey?: string;
}

export interface CertificateCredential {
  type: 'CERTIFICATE';
  certificate: string;
  privateKey: string;
  passphrase?: string;
  caCertificate?: string;
}

export interface CustomCredential {
  type: 'CUSTOM';
  data: Record<string, string>;
}

export type CredentialData =
  | ApiKeyCredential
  | BearerTokenCredential
  | BasicAuthCredential
  | OAuth2Credential
  | SshKeyCredential
  | CertificateCredential
  | CustomCredential;

// Credential Reference (used in workflow definition)
export interface CredentialReference {
  credentialId: string;
  credentialType: CredentialType;
  scope?: string;
  resolveAt: 'DESIGN_TIME' | 'RUNTIME'; // When to resolve the actual credential
}

// Credential Test Result
export interface CredentialTestResult {
  success: boolean;
  message: string;
  testedAt: string;
  responseTime?: number;
  errorCode?: string;
}

// Credential Usage Log
export interface CredentialUsageLog {
  id: string;
  credentialId: string;
  usedBy: string; // User or workflow instance
  usedAt: string;
  context: 'WORKFLOW_INSTANCE' | 'TEST' | 'MANUAL';
  workflowInstanceId?: string;
  success: boolean;
}
