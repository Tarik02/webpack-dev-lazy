declare module 'webpack/lib/hmr/LazyCompilationPlugin.js' {
  import Webpack from 'webpack';

  namespace LazyCompilationPlugin {
    type ModuleInfo = {
      client: string;
      data: string;
      active: boolean;
    };

    type BackendApi = {
      module: (module: Webpack.Module) => ModuleInfo;
      dispose: (callback: (error?: Error) => void) => void;
    };

    type Options = {
      backend?: (
        | ((compiler: Webpack.Compiler) => PromiseLike<BackendApi>)
        | ((compiler: Webpack.Compiler, callback: (error?: Error, backendApi?: BackendApi) => void) => void)
      ),
      entries?: boolean;
      imports?: boolean;
      test?: RegExp | string | ((module: Webpack.Module) => boolean);
    };
  }

  class LazyCompilationPlugin {
    constructor(options?: LazyCompilationPlugin.Options);

    apply(compiler: Webpack.Compiler): void;
  }

  export default LazyCompilationPlugin;
}
