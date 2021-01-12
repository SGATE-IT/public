const { utils, actions } = require("./deps");

(async () => {
  const { location } = window;
  try {
    const params = utils.params(location.search.slice(1));
    const { action } = params;
    await (actions[action] || actions.Default)(params);
  } catch (e) {
    utils.showError(e);
  }
})();
