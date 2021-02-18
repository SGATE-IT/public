function Actions(cnf, deps) {
  const {
    payment: { root: PAYMENT_ROOT }
  } = cnf;
  const { utils, document, location } = deps;

  const $name = document.getElementById("name");
  const $amount = document.getElementById("amount");
  const $currency = document.getElementById("currency");
  const $mobile = document.getElementById("mobile");
  const $btn = document.getElementById("paymentBtn");
  const $gates = document.getElementsByName("gate");

  $name.value += Math.random()
    .toString(36)
    .slice(2);

  const getGate = () => {
    const el = [].find.call($gates, x => x.checked);
    return el && el.value;
  };

  const addOrder = async () => {
    const gate = getGate();
    const order = await utils.addOrder(
      $name.value,
      $amount.value | 0,
      $currency.value,
      $mobile.value,
      gate
    );

    let target;
    if (gate === "mastercard") {
      const adds = utils.orderURLs(location, order.id);
      adds.orderId = order.gateOrderId;
      adds.ticket = order.gateTicket;
      target = utils.modifiyURL(PAYMENT_ROOT, adds);
    }

    return [order, target];
  };

  let doing = false;
  /** 默认动作，也就是开始订单的动作 */
  const Default = async () => {
    $btn.addEventListener("click", async () => {
      // 避免重复点击
      if (doing) return;
      doing = true;
      try {
        const [order, target] = await addOrder();
        doing = false;
        utils.showSuccess(`创建订单成功: ${order.id}`, target);
        await utils.sleep(20);
        if (order.gate === "stcpay") {
          await confirms(order);
        }
      } catch (e) {
        doing = false;
        utils.showError(e);
      }
    });
  };

  const confirms = async order => {
    const value = prompt("Please input SMS verfy code from STCPay");
    if (!value) {
      utils.showError("Cancel payment confirm");
      return;
    }
    try {
      await utils.stcPayOrderConfirm(order, value);
      utils.showSuccess(order);
      await utils.sleep(20);
    } catch (e) {
      utils.showError(e);
      await utils.sleep(20);
      await confirms(order);
    }
  };

  /** 订单支付完成 */
  const complete = async params => {
    const order = await utils.orderRemind(params.orderId);
    utils.showSuccess(order);
  };

  /** 订单支付失败 */
  const error = async ({ orderId, ticket, ...params }) => {
    utils.showError(Error(`Payment error: ${JSON.stringify(params)}`));
  };

  /** 订单支付取消 */
  const cancel = async () => {
    utils.showError(Error("Payment cancel"));
  };

  return { Default, complete, error, cancel };
}
module.exports = Actions;
