// Production JSX runtime: pure passthrough. Production builds compile to
// jsx/jsxs (no source info), so CmdZero adds zero bytes and zero work.
'use strict';

module.exports = require('react/jsx-runtime');
