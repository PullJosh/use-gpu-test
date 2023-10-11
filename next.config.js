// @ts-check

const { join } = require("path");
const { access, symlink } = require("fs/promises");

/**
 * @type {import('next').NextConfig}
 **/
const nextConfig = {
  cleanDistDir: false,
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
  ) => {
    config.experiments = {
      syncWebAssembly: true,
      layers: true, // I have no idea what this does, but when it was disabled I got the error "'entryOptions.layer' is only allowed when 'experiments.layers' is enabled"
    };

    config.resolve.extensions.push(".wgsl");

    config.module.rules.push({
      test: /\.wgsl$/i,
      use: [
        {
          loader: "@use-gpu/wgsl-loader",
          options: { minify: !dev },
        },
      ],
    });

    patchWasmModuleImport(config, isServer);

    return config;
  },
};

module.exports = nextConfig;

function patchWasmModuleImport(config, isServer) {
  config.optimization.moduleIds = "named";

  // TODO: improve this function -> track https://github.com/vercel/next.js/issues/25852
  // if (isServer) {
  //   config.output.webassemblyModuleFilename =
  //     "./../static/wasm/[modulehash].wasm";
  // }

  // config.plugins.push(
  //   new (class {
  //     apply(compiler) {
  //       compiler.hooks.afterEmit.tapPromise(
  //         "SymlinkWebpackPlugin",
  //         async (compiler) => {
  //           if (isServer) {
  //             const from = join(compiler.options.output.path, "../static");
  //             const to = join(compiler.options.output.path, "static");

  //             try {
  //               await access(from);
  //               console.log(`${from} already exists`);
  //               return;
  //             } catch (error) {
  //               if (error.code === "ENOENT") {
  //                 // No link exists
  //               } else {
  //                 throw error;
  //               }
  //             }

  //             await symlink(to, from, "junction");
  //             console.log(`created symlink ${from} -> ${to}`);
  //           }
  //         }
  //       );
  //     }
  //   })()
  // );
}
