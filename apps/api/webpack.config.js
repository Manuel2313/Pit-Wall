const path = require('path')
const nodeExternals = require('webpack-node-externals')

// Nest's default nodeExternals() reads modules from process.cwd(), which in
// workspaces only contains .vite — so nothing got externalized and webpack tried
// to parse native .node binaries. Point externals at the repo-root node_modules
// (npm workspaces hoist there) and bundle only the workspace packages, whose
// package.json "main" points at TypeScript sources Node cannot load directly.
module.exports = (options) => {
  options.externals = [
    nodeExternals({
      modulesDir: path.resolve(__dirname, '../../node_modules'),
      additionalModuleDirs: [path.resolve(__dirname, 'node_modules')],
      allowlist: [/^@pit-wall\//],
    }),
  ]
  return options
}
