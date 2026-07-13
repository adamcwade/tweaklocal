// Development JSX runtime that stamps host elements with their source
// location. The compiler (SWC, Babel, esbuild — any bundler) already passes
// {fileName, lineNumber, columnNumber} to jsxDEV in dev builds; we just copy
// it onto the DOM as data-cz so the CmdZero overlay/daemon can map any
// rendered element back to its exact JSX expression. Server components
// included — the attribute serializes to HTML like any other.
'use strict';

const ReactJSXDev = require('react/jsx-dev-runtime');

exports.Fragment = ReactJSXDev.Fragment;

exports.jsxDEV = function jsxDEV(type, props, key, isStaticChildren, source, self) {
  if (
    typeof type === 'string' &&
    source &&
    source.fileName &&
    !source.fileName.includes('node_modules') &&
    (!props || props['data-cz'] === undefined)
  ) {
    props = Object.assign({}, props, {
      'data-cz': `${source.fileName}:${source.lineNumber}:${source.columnNumber ?? 0}`,
    });
  }
  return ReactJSXDev.jsxDEV(type, props, key, isStaticChildren, source, self);
};
