const { expoRouterBabelPlugin } = require("babel-preset-expo/build/expo-router-plugin");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Monorepo: babel-preset-expo can't resolve expo-router from the repo root,
      // so EXPO_ROUTER_APP_ROOT never gets inlined into expo-router/_ctx.*.js
      expoRouterBabelPlugin,
      [
        "module-resolver",
        {
          alias: {
            "@": "./",
          },
          extensions: [".tsx", ".ts", ".js", ".jsx"],
        },
      ],
    ],
  };
};
