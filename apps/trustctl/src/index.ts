/**
 * trustctl - ATN CLI tool exports
 */

export { loadConfig, saveConfig, saveAgent, getAgent, getAtnHost, setAtnHost } from './config';
export { sendSignedRequest, sendUnsignedRequest, deriveDid } from './client';

export const version = '0.1.0';
