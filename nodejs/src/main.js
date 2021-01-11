const { utils, payment, actions } = require("./deps");

(async () => {
  const file = utils.getLocationFile();
  try {
    const params = utils.params(location.search.slice(1));
    await (actions[file] || actions.Default)(params);
  } catch (e) {
    utils.showError(e);
  }
})();
