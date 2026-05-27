const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: merge Expo defaults with repo root (do not replace watchFolders)
const defaultWatchFolders = config.watchFolders ?? [];
config.watchFolders = [...new Set([...defaultWatchFolders, monorepoRoot])];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.alias = {
  ...config.resolver.alias,
  "@convex": path.resolve(monorepoRoot, "convex"),
};

// @huddlestat/shared uses NodeNext ESM imports (*.js → *.ts). Metro needs help.
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    const tsModuleName = moduleName.replace(/\.js$/, ".ts");
    const originDir = path.dirname(context.originModulePath ?? "");
    const tsPath = path.join(originDir, tsModuleName);
    if (fs.existsSync(tsPath)) {
      return context.resolveRequest(
        { ...context, resolveRequest: undefined },
        tsModuleName,
        platform,
      );
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
