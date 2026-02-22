/**
 * ATN HTTP client
 * Handles signing and sending requests to ATN server
 */

import * as ATN from '@atn/core';

export interface RequestOptions {
  method: string;
  path: string;
  payload?: unknown;
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

export interface Response {
  status: number;
  data: unknown;
}

/**
 * Derive DID from public key
 */
export function deriveDid(publicKey: string): string {
  return `did:atn:${publicKey.substring(0, 16)}`;
}

/**
 * Sign and send a request to ATN
 */
export async function sendSignedRequest(opts: RequestOptions): Promise<Response> {
  const { method, path, payload, publicKey, secretKey, baseUrl } = opts;

  // Canonicalize payload
  const canonical = ATN.canonicalize(payload || {});
  const bytes = Buffer.from(canonical, 'utf-8');

  // Sign
  const signature = ATN.sign(bytes, secretKey);
  const signerId = deriveDid(publicKey);

  // Build request body
  const body = {
    payload: payload || {},
    signature,
    signerId,
  };

  // Send request
  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    return {
      status: response.status,
      data,
    };
  } catch (err) {
    throw new Error(`Failed to connect to ${url}: ${(err as Error).message}`);
  }
}

/**
 * Send an unsigned GET request
 */
export async function sendUnsignedRequest(
  path: string,
  baseUrl: string
): Promise<Response> {
  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));

    return {
      status: response.status,
      data,
    };
  } catch (err) {
    throw new Error(`Failed to connect to ${url}: ${(err as Error).message}`);
  }
}
