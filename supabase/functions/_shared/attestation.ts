/**
 * Attestation Verification Module
 * Verifies web (Cloudflare Turnstile) and Android (Google Play Integrity) tokens.
 * Behind an interface `IAttestationVerifier` so it can be mocked in tests.
 */

import { AttestationPayload, AttestationVerificationResult } from './types.ts';
import { Errors } from './errors.ts';

export interface IAttestationVerifier {
  verify(attestation: unknown, clientIp?: string): Promise<AttestationVerificationResult>;
}

/**
 * Cloudflare Turnstile Server-Side Verifier
 */
export class TurnstileVerifier {
  private secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || Deno.env.get('TURNSTILE_SECRET_KEY') || '';
  }

  async verify(token: string, clientIp?: string): Promise<AttestationVerificationResult> {
    if (!token || typeof token !== 'string') {
      return { valid: false, provider: 'turnstile', error: 'Missing turnstile token' };
    }

    if (!this.secretKey) {
      console.warn('TURNSTILE_SECRET_KEY is not configured on the server.');
      return { valid: false, provider: 'turnstile', error: 'Server attestation key unconfigured' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      if (clientIp) {
        formData.append('remoteip', clientIp);
      }

      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!res.ok) {
        return {
          valid: false,
          provider: 'turnstile',
          error: `Turnstile verification request failed with HTTP ${res.status}`,
        };
      }

      const outcome = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
      if (!outcome.success) {
        return {
          valid: false,
          provider: 'turnstile',
          error: `Turnstile challenge rejected: ${(outcome['error-codes'] || []).join(', ')}`,
        };
      }

      return { valid: true, provider: 'turnstile' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, provider: 'turnstile', error: `Turnstile network error: ${message}` };
    }
  }
}

/**
 * Android Play Integrity Server-Side Verifier
 */
export class PlayIntegrityVerifier {
  private packageName: string;
  private serviceAccountToken?: string;

  constructor(packageName?: string, serviceAccountToken?: string) {
    this.packageName = packageName || Deno.env.get('PLAY_INTEGRITY_PACKAGE_NAME') || 'com.halchal.app';
    this.serviceAccountToken = serviceAccountToken || Deno.env.get('PLAY_INTEGRITY_SERVICE_ACCOUNT_TOKEN');
  }

  async verify(token: string, explicitPackageName?: string): Promise<AttestationVerificationResult> {
    if (!token || typeof token !== 'string') {
      return { valid: false, provider: 'play_integrity', error: 'Missing Play Integrity token' };
    }

    const pkg = explicitPackageName || this.packageName;
    if (!this.serviceAccountToken) {
      console.warn('PLAY_INTEGRITY_SERVICE_ACCOUNT_TOKEN is not configured.');
      return { valid: false, provider: 'play_integrity', error: 'Play Integrity credentials unconfigured' };
    }

    try {
      const url = `https://playintegrity.googleapis.com/v1/${pkg}:decodeIntegrityToken`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.serviceAccountToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ integrityToken: token }),
      });

      if (!res.ok) {
        return {
          valid: false,
          provider: 'play_integrity',
          error: `Google Play Integrity API returned HTTP ${res.status}`,
        };
      }

      const body = (await res.json()) as {
        tokenPayloadExternal?: {
          appLicensingVerdict?: string;
          appRecognitionVerdict?: string;
          deviceRecognitionVerdict?: {
            deviceRecognitionVerdict?: string[];
          };
        };
      };

      const payload = body.tokenPayloadExternal;
      if (!payload) {
        return { valid: false, provider: 'play_integrity', error: 'Empty integrity token payload' };
      }

      const isAppRecognized = payload.appRecognitionVerdict === 'PLAY_RECOGNIZED';
      const deviceVerdicts = payload.deviceRecognitionVerdict?.deviceRecognitionVerdict || [];
      const meetsDeviceIntegrity =
        deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY') ||
        deviceVerdicts.includes('MEETS_STRONG_INTEGRITY');

      if (!isAppRecognized || !meetsDeviceIntegrity) {
        return {
          valid: false,
          provider: 'play_integrity',
          error: `Integrity check failed. AppRecognized=${isAppRecognized}, MeetsDeviceIntegrity=${meetsDeviceIntegrity}`,
          details: payload as Record<string, unknown>,
        };
      }

      return { valid: true, provider: 'play_integrity' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, provider: 'play_integrity', error: `Play Integrity network error: ${message}` };
    }
  }
}

/**
 * Composite Production Attestation Verifier
 */
export class ProductionAttestationVerifier implements IAttestationVerifier {
  private turnstileVerifier: TurnstileVerifier;
  private playIntegrityVerifier: PlayIntegrityVerifier;

  constructor(turnstileVerifier?: TurnstileVerifier, playIntegrityVerifier?: PlayIntegrityVerifier) {
    this.turnstileVerifier = turnstileVerifier || new TurnstileVerifier();
    this.playIntegrityVerifier = playIntegrityVerifier || new PlayIntegrityVerifier();
  }

  async verify(attestation: unknown, clientIp?: string): Promise<AttestationVerificationResult> {
    if (!attestation) {
      return { valid: false, error: 'Attestation is required for write operations' };
    }

    // String token shorthand -> treat as Turnstile
    if (typeof attestation === 'string') {
      return await this.turnstileVerifier.verify(attestation, clientIp);
    }

    if (typeof attestation === 'object' && attestation !== null) {
      const payload = attestation as Partial<AttestationPayload>;
      if (payload.provider === 'turnstile' && payload.token) {
        return await this.turnstileVerifier.verify(payload.token, clientIp);
      }
      if (payload.provider === 'play_integrity' && payload.token) {
        return await this.playIntegrityVerifier.verify(payload.token, (payload as { packageName?: string }).packageName);
      }
    }

    return { valid: false, error: 'Unsupported or malformed attestation payload' };
  }
}

/**
 * Mock Attestation Verifier for Automated Unit & Abuse Tests
 */
export class MockAttestationVerifier implements IAttestationVerifier {
  private allowedTokens = new Set<string>([
    'valid-turnstile-token',
    'valid-play-integrity-token',
    'mock-valid-attestation',
  ]);

  constructor(allowedTokens?: string[]) {
    if (allowedTokens) {
      this.allowedTokens = new Set(allowedTokens);
    }
  }

  addAllowedToken(token: string): void {
    this.allowedTokens.add(token);
  }

  async verify(attestation: unknown, _clientIp?: string): Promise<AttestationVerificationResult> {
    if (!attestation) {
      return { valid: false, error: 'Missing attestation' };
    }

    let token = '';
    let provider = 'mock';

    if (typeof attestation === 'string') {
      token = attestation;
    } else if (typeof attestation === 'object' && attestation !== null) {
      const payload = attestation as Record<string, unknown>;
      token = String(payload.token || '');
      provider = String(payload.provider || 'mock');
      if (payload.valid === false) {
        return { valid: false, provider, error: 'Explicitly marked invalid in mock' };
      }
      if (payload.valid === true) {
        return { valid: true, provider };
      }
    }

    if (this.allowedTokens.has(token)) {
      return { valid: true, provider };
    }

    return { valid: false, provider, error: 'Attestation token rejected by mock verifier' };
  }
}

let globalAttestationVerifier: IAttestationVerifier | null = null;

export function getAttestationVerifier(custom?: IAttestationVerifier): IAttestationVerifier {
  if (custom) return custom;
  if (!globalAttestationVerifier) {
    if (Deno.env.get('HALCHAL_TEST_MODE') === 'true') {
      globalAttestationVerifier = new MockAttestationVerifier();
    } else {
      globalAttestationVerifier = new ProductionAttestationVerifier();
    }
  }
  return globalAttestationVerifier;
}

export function setGlobalAttestationVerifier(verifier: IAttestationVerifier | null): void {
  globalAttestationVerifier = verifier;
}
