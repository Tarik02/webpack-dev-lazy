# webpack-dev-lazy

![Check](https://github.com/Tarik02/webpack-dev-lazy/actions/workflows/check.yml/badge.svg)
![Publish to NPM](https://github.com/Tarik02/webpack-dev-lazy/actions/workflows/publish-to-npm.yml/badge.svg)
[![npm version](https://badge.fury.io/js/webpack-dev-lazy.svg)](https://badge.fury.io/js/webpack-dev-lazy)

This plugin uses internal webpack experimental `lazyCompilation` feature which, by default, works by starting a new server.

This plugin, instead, uses already running `webpack-dev-server` by attaching a middleware to it.

## Installation

```bash
yarn add --dev webpack-dev-lazy
# or
npm install --save-dev webpack-dev-lazy
```

## Usage

Add this to your webpack config:
```js
import Webpack from 'webpack';
import WebpackDevLazy from 'webpack-dev-lazy';

// ...

export default async (env) => {

  // ...

  plugins: [
    //
    // NOTE: Enable this plugin only if you are running webpack-dev-server.
    // This can be checked using `env.WEBPACK_SERVE` variable.
    // This is important, otherwise it will break non-serve builds.
    //

    ...env.WEBPACK_SERVE ? [ new WebpackDevLazy({
      //
      // Option: entries
      // Default: true
      // A boolean value that describes whether entries should be compiled only on demand.
      //

      entries: false,

      //
      // Option: imports
      // Default: true
      // A boolean value that describes whether import(...) expressions should be compiled only on demand.
      //

      imports: false,

      //
      // Option: test
      // String (checked with startsWith) or RegEx or function to check whether the module should by
      // compiled only on demand. By default, all modules are compiled on demand.
      //

      test: /\.lazy\.js$/i,

      test: '/path/to/lazy/compiled/modules',

      /** @param {Webpack.Module} module */
      test: module => module.nameForCondition().startsWith('/path/to/lazy/compiled/modules'),

      //
      // Option: unusedTimeout
      // Default: 120000
      // A number of milliseconds a module should be left in compilation after last module user has disconnected.
      //

      unusedTimeout: 60000,

      //
      // Option: baseUri
      // Default: "dev-lazy"
      // Base URI used for communication with server to subscribe to modules.
      //

      baseUri: 'my-dev-lazy',
    }) ] : [],
  ],

  // ...
```
