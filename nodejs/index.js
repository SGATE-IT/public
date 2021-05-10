const fs = require("fs");
const os = require("os");
const _ = require("lodash");
const axios = require("axios");
const Ajv = require("ajv").default;
const restify = require("restify");
const Logger = require("@open-node/logger");
const cnf = require("./config");
const orders = require("./orders");
const schema = require("./schema");
const sdk = require("./sdk")(cnf.sdk, { _, axios });

const ajv = new Ajv();
const validate = ajv.compile(schema);

const logger = Logger(cnf.logger);

const updateOrders = () => {
  fs.writeFileSync(`${__dirname}/orders.json`, JSON.stringify(orders, null, 2));
};

const axiosError = (e) => {
  if (!e.response) return ["no-response", e.message];
  const r = e.response;
  if (!r.data) return [r.status, r.statusText];
  const d = r.data;
  if (typeof d === "string") return [r.status, d];
  return [d.code || r.status, d.message || d, JSON.stringify(d.data)];
};

axios.post = logger.logger(axios.post, "axios.post", true, (res) => res.data, axiosError);
axios.get = logger.logger(axios.get, "axios.get", true, (res) => res.data, axiosError);

const orderDict = {};
for (const x of orders) orderDict[x.id] = x;

const genOrderId = () => {
  const main = new Date().toISOString().replace(/[^\d+]/g, "");
  const rand = Math.random().toString().slice(2, 10);

  return `${main}${rand}`;
};

const server = restify.createServer({
  name: "openPay-case-node.js",
  version: "1.0.0",
});

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(
  restify.plugins.bodyParser({
    uploadDir: os.tmpdir(),
    multiples: false,
  })
);

for (const k of ["get", "post", "put", "patch", "del"]) {
  const origMethod = server[k].bind(server);
  server[k] = (path, fn) => {
    origMethod(path, async (req, res, next) => {
      try {
        await fn(req, res);
      } catch (e) {
        next(e);
      }
    });
  };
}

server.get("/orders", (req, res, next) => {
  res.send(orders);
  return next();
});

// 这个接口是站点自己提醒自己去验证订单状态，站点需要自行判断用户登录状态
// 比如游客随意访问该接口, 导致的安全的问题
server.put("/orders/:gateOrderId/remind", async (req, res) => {
  const { gateOrderId } = req.params;

  const order = orders.find((x) => x.gateOrderId === gateOrderId);
  if (order) {
    const { status } = await sdk.detail(order.gateOrderId);
    if (status === "paid") {
      order.status = "paid";
      order.updatedAt = Date.now();
      updateOrders();
    }
    res.send(order);
  } else {
    res.send(404);
  }
});

// STCPay 支付确认
server.put("/orders/:gateOrderId/stcpay/status/paid", async (req, res) => {
  const { gateOrderId } = req.params;
  const { value } = req.body;

  const order = orders.find((x) => x.gateOrderId === gateOrderId);
  if (order) {
    const { status } = await sdk.stcPayConfirm(order.gateOrderId, order.gateTicket, value);
    if (status === "paid") {
      order.status = "paid";
      order.updatedAt = Date.now();
      updateOrders();
    }
    res.send(order);
  } else {
    res.send(404);
  }
});

// 这个接口是留给支付平台回调通知的，非登录用户，因此一定要验证签名是否合法
server.get("/orders/:orderId/notification", async (req, res) => {
  const { orderId } = req.params;

  const opt = {
    uri: `/api_v1${req.url}`,
    key: req.header("x-auth-key"),
    timestamp: req.header("x-auth-timestamp") | 0,
    signMethod: req.header("x-auth-sign-method"),
    signVersion: req.header("x-auth-sign-version"),
    method: "order.notification",
  };

  const signature = req.header("x-auth-signature");
  if (!sdk.verify(opt, signature)) throw Error("签名错误");

  const order = orderDict[orderId];
  if (order) {
    const { status } = await sdk.detail(order.gateOrderId);
    if (status !== "paid") throw Error("order detail status isnt paid");
    order.status = "paid";
    order.updatedAt = Date.now();
    updateOrders();
    // 网关接口约定必须返回这个字符串，才算确认
    res.send(`COMPLETED::${order.gateOrderId}`);
  } else {
    res.send(404);
  }
});

server.post("/orders", async (req, res) => {
  const order = req.body;
  order.id = genOrderId();
  const valid = validate(order);
  if (!valid) {
    res.send(422, validate.errors);
  } else {
    order.createdAt = Date.now();
    order.updatedAt = Date.now();

    const { id, ticket } = await sdk.create({
      userOrderId: order.id,
      gate: order.gate || "mastercard",
      name: order.name,
      amount: order.amount,
      currency: order.currency,
      mobile: order.mobile,
      notificationURL: `${cnf.site}/api_v1/orders/${order.id}/notification`,
    });

    order.gateOrderId = id;
    order.gateTicket = ticket;
    order.status = "active";

    orders.push(order);
    orderDict[order.id] = order;
    updateOrders();
    res.send(201, order);
  }
});

server.listen(19999, () => {
  console.log("%s listening at %s", server.name, server.url);
});
