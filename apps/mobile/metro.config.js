const { getDefaultConfig } = require("expo/metro-config");
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

module.exports = config;
