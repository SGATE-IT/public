function Actions(cnf, deps) {
  const {
    payment: { root: PAYMENT_ROOT }
  } = cnf;
  const { utils, document, location } = deps;

  const $name = document.getElementById("name");
  const $amount = document.getElementById("amount");
  const $currency = document.getElementById("currency");
  const $btn = document.getElementById("paymentBtn");

  $name.value += Math.random()
    .toString(36)
    .slice(2);

  const addOrder = async () => {
    const order = await utils.addOrder(
      $name.value,
      $amount.value | 0,
      $currency.value
    );

    const adds = utils.orderURLs(location, order.id);
    adds.orderId = order.gateOrderId;
    adds.ticket = order.gateTicket;
    const target = utils.modifiyURL(PAYMENT_ROOT, adds);

    return [order, target];
  };

  /** 默认动作，也就是开始订单的动作 */
  const Default = async () => {
    $btn.addEventListener("click", async () => {
      try {
        const [order, target] = await addOrder();
        utils.showSuccess(`创建订单成功: ${order.id}`, target);
      } catch (e) {
        utils.showError(e);
      }
    });
  };

  /** 订单支付完成 */
  const complete = async params => {
    const order = await utils.orderRemind(params.orderId);
    utils.showSuccess(order);
  };

  /** 订单支付失败 */
  const error = async ({ orderId, ticket, ...params }) => {
    utils.showError(Error(JSON.stringify(params)), localStorage.errorURL);
  };

  /** 订单支付取消 */
  const cancel = async () => {
    utils.showError(Error("Payment cancel"), localStorage.cancelURL);
  };

  return { Default, complete, error, cancel };
}
module.exports = Actions;
