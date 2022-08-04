import Express from 'express';
import multimatch from 'multimatch';
import { createRequire } from 'node:module';
import * as Path from 'node:path';
import Webpack from 'webpack';
import LazyCompilationPlugin from 'webpack/lib/hmr/LazyCompilationPlugin.js';
import { injectDevServerMiddlewareSetup } from './quirks/injectDevServerMiddlewareSetup.js';

const PLUGIN_NAME = 'WebpackDevLazy';

type Options = {
  entries?: boolean;
  imports?: boolean;
  test?: string | string[] | ((module: Webpack.Module) => boolean);
  unusedTimeout?: number;
  baseUri?: string;
};

type ModuleState = (
  | { type: 'used', subCount: number }
  | { type: 'unused', recycleTimeout: ReturnType<typeof setTimeout> }
);

export class WebpackDevLazy {
  constructor(protected options: Options = {}) {
  }

  apply(compiler: Webpack.Compiler): void {
    const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);

    const baseUri = this.options.baseUri ?? 'dev-lazy';
    const unusedTimeout = this.options.unusedTimeout ?? 120000;
    const activeModules = new Map<string, ModuleState>();

    const require = createRequire(import.meta.url);
    const client = require.resolve('../lib/client.cjs');

    const backendPromise = new Promise<LazyCompilationPlugin.BackendApi>(resolve => {
      injectDevServerMiddlewareSetup(compiler.options, {
        before: (middlewares, devServer) => {
          const middleware = {
            name: PLUGIN_NAME,
            path: '/' + baseUri,
            middleware: (req: Express.Request, res: Express.Response) => {
              const keys = req.url.split("@");
              req.socket.on('close', () => {
                for (const key of keys) {
                  const state = activeModules.get(key)! as ModuleState & { type: 'used' };
                  if (--state.subCount === 0) {
                    activeModules.set(key, {
                      type: 'unused',
                      recycleTimeout: setTimeout(() => {
                        activeModules.delete(key);
                        logger.log(
                          `${key} is no longer in use. Next compilation will skip this module.`
                        );
                      }, unusedTimeout)
                    });
                  }
                }
              });
              res.socket?.setNoDelay(true);
              res.writeHead(200, {
                "content-type": "text/event-stream",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*"
              });
              res.write("\n");
              let didActivateAnyModule = false;
              for (const key of keys) {
                const oldState = activeModules.get(key);

                if (oldState === undefined) {
                  activeModules.set(key, { type: 'used', subCount: 1 })
                  didActivateAnyModule = true;
                  logger.log(`${key} is now in use and will be compiled.`);
                } else{
                  switch (oldState.type) {
                    case 'used':
                      ++oldState.subCount;
                      break;

                    case 'unused':
                      clearTimeout(oldState.recycleTimeout);
                      activeModules.set(key, { type: 'used', subCount: 1 })
                      break;
                  }
                }
              }
              if (didActivateAnyModule) {
                compiler.watching?.invalidate();
              }
            },
          };
          middlewares.unshift(middleware);

          resolve({
            module: originalModule => {
              const key = `${encodeURIComponent(
                originalModule.identifier().replace(/\\/g, "/").replace(/@/g, "_")
              ).replace(/%(2F|3A|24|26|2B|2C|3B|3D|3A)/g, decodeURIComponent)}`;
              const active = activeModules.has(key);
              return {
                client: `${client}?baseUri=${encodeURIComponent(baseUri + '/')}`,
                data: key,
                active
              };
            },
            dispose: callback => {
              const index = middlewares.indexOf(middleware);
              if (index !== -1) {
                middlewares.splice(index, 1);
              }
              callback();
            },
          });

          return middlewares;
        },
      });
    });

    (new LazyCompilationPlugin({
      backend: () => backendPromise,
      entries: this.options.entries ?? true,
      imports: this.options.imports ?? true,
      test: typeof this.options.test === 'string' || this.options.test instanceof Array ?
        module => {
          const patterns = (
            typeof this.options.test === 'string' ? [ this.options.test ] : this.options.test
          ) as Array<string>;
          const conditionName = module.nameForCondition();
          if (conditionName === null) {
            return false;
          }

          return multimatch(
            [
              conditionName,
              Path.relative(compiler.context, conditionName),
              './' + Path.relative(compiler.context, conditionName),
            ],
            patterns,
          ).length > 0;
        } :
        this.options.test,
    })).apply(compiler);
  }
}
