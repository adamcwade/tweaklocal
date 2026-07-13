const path = require('path');

/**
 * Stamps every host JSX element (lowercase tag) with
 * data-cz="<relative file>:<line>:<column>" in dev builds.
 * line is 1-based, column is 0-based — matching @babel/parser locs,
 * so the daemon can resolve a stamp back to the exact AST node.
 */
module.exports = function cmdzeroSourceStamp({ types: t }) {
  return {
    name: 'cmdzero-source-stamp',
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const node = nodePath.node;
        if (!node.loc) return;
        const name = node.name;
        // Only host elements render attributes to the DOM directly.
        if (!t.isJSXIdentifier(name) || !/^[a-z]/.test(name.name)) return;
        if (
          node.attributes.some(
            (a) => t.isJSXAttribute(a) && a.name && a.name.name === 'data-cz'
          )
        )
          return;

        const filename = state.filename || state.file.opts.filename;
        if (!filename) return;
        const root = state.opts.root || process.cwd();
        const rel = path.relative(root, filename);
        // Skip files outside the project root (e.g. node_modules via deps).
        if (rel.startsWith('..') || rel.includes('node_modules')) return;

        const stamp = `${rel}:${node.loc.start.line}:${node.loc.start.column}`;
        node.attributes.push(
          t.jsxAttribute(t.jsxIdentifier('data-cz'), t.stringLiteral(stamp))
        );
      },
    },
  };
};
