import type { NextConfig } from 'next';

/**
 * No custom headers here, deliberately.
 *
 * WebMCP only works in origin-isolated documents. Sending
 * `Origin-Agent-Cluster: ?0` disables `document.modelContext` entirely.
 * Absence is the correct configuration.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
