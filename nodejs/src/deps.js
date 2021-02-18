const cnf = require("./config");
const utils = require("./utils")(cnf, {
  document: window.document,
  location: window.location,
  $root: document.getElementById("root"),
  $loading: document.getElementById("loading"),
  $error: document.getElementById("error"),
  $success: document.getElementById("success")
});
const Actions = require("./actions");

const deps = {
  cnf,
  utils,
  document: window.document,
  location: window.location
};
deps.actions = Actions(cnf, deps);

module.exports = deps;
