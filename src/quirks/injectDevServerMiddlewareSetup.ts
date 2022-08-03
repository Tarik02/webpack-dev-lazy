import Webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';

export const injectDevServerMiddlewareSetup = (
  config: Webpack.Configuration | Webpack.WebpackOptionsNormalized,
  { before, after }: {
    before?: WebpackDevServer.Configuration['setupMiddlewares'],
    after?: WebpackDevServer.Configuration['setupMiddlewares'],
  }
) => {
  if (!config.devServer) {
    config.devServer = {};
  }

  const oldSetupMiddlewares = config.devServer!.setupMiddlewares;
  config.devServer!.setupMiddlewares = (middlewares, devServer) => {
    if (before) {
      middlewares = before(middlewares, devServer);
    }
    if (oldSetupMiddlewares) {
      middlewares = oldSetupMiddlewares(middlewares, devServer);
    }
    if (after) {
      middlewares = after(middlewares, devServer);
    }
    return middlewares;
  };
};
