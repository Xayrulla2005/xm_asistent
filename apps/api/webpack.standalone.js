/**
 * Standalone webpack config — no Nx executor context required.
 * Use when `nx run @org/api:build` fails (Node 22 + Windows ESM bug).
 *
 * Build:
 *   cd apps/api
 *   ..\..\node_modules\.bin\webpack-cli.cmd --config webpack.standalone.js
 */

const path = require('path');

module.exports = {
  entry: './src/main.ts',
  target: 'node',
  mode: 'production',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    clean: true,
  },

  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.app.json'),
            // transpileOnly skips full type-checking — needed because the
            // base tsconfig has emitDeclarationOnly + nodenext module which
            // would block JS emit. Type errors are caught by tsc --noEmit separately.
            transpileOnly: true,
            compilerOptions: {
              // Override base tsconfig settings incompatible with bundling.
              // Use bundler+ESNext so customConditions remains valid and webpack
              // handles the CommonJS transform itself.
              module: 'ESNext',
              moduleResolution: 'bundler',
              emitDeclarationOnly: false,
              declaration: false,
              declarationMap: false,
              composite: false,
              noEmitOnError: false,
              noUnusedLocals: false,
              importHelpers: false,
              // NestJS decorator requirements
              experimentalDecorators: true,
              emitDecoratorMetadata: true,
            },
          },
        },
      },
    ],
  },

  optimization: {
    // No minification — NestJS DI relies on function.name and class names
    minimize: false,
  },

  // Keep real __dirname/__filename so env file resolution works
  node: {
    __dirname: false,
    __filename: false,
  },

  // Externalize node_modules — require() calls are resolved at runtime
  // from the workspace root node_modules (../../node_modules relative to dist/)
  externals: [
    (ctx, callback) => {
      const req = ctx.request;
      // Externalize bare module specifiers (npm packages), not relative paths
      if (req && /^[a-zA-Z@]/.test(req) && !path.isAbsolute(req)) {
        return callback(null, 'commonjs ' + req);
      }
      callback();
    },
  ],
};
