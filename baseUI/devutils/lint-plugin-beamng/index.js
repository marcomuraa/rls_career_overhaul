const plugin = {
  meta: {
    name: "beamng",
  },
  rules: {
    "vue-template-operators": require("./rules/vue-template-operators"),
    "lua-signatures": require("./rules/lua-signatures"),
    "import-no-unresolved": require("./rules/import-no-unresolved"),
  },
};

module.exports = plugin;
