'use strict';

const React = require('react');

/**
 * Drop this in your root layout to load the CmdZero overlay in development:
 *   <CmdZeroOverlay />            // daemon on the default port
 *   <CmdZeroOverlay origin="http://localhost:4101" />
 * Renders nothing in production.
 */
function CmdZeroOverlay({ origin = 'http://localhost:4100' } = {}) {
  if (process.env.NODE_ENV === 'production') return null;
  return React.createElement('script', { src: `${origin}/overlay.js`, defer: true });
}

module.exports = { CmdZeroOverlay };
