const ec = encodeURIComponent;
const dc = decodeURIComponent;

function Utils(cnf, { location, $root, $error, $success, $loading }) {
  const { mode, api: API_ROOT } = cnf;
  /** 解析 queryString 为 hash object, 简易版本的 queryString.parse */
  const params = queryString => {
    const obj = {};
    if (!queryString) return params;

    for (const pair of queryString.split("&")) {
      const [key, value] = pair.split("=");
      obj[dc(key)] = dc(value);
    }

    return obj;
  };

  const a = document.createElement("a");
  const urlFields = Object.freeze(["origin", "pathname", "search", "hash"]);
  const urlParse = url => {
    a.href = url;
    const obj = {};
    for (const key of urlFields) obj[key] = a[key];

    return obj;
  };

  /**
   * 修改指定url上添加一些参数
   * @params String address 给定的url地址
   * @params Object adds 要添加的参数
   * @params Array [removes] 要删除的参数key列表
   */
  const modifiyURL = (address, adds, removes) => {
    const obj = urlParse(address);
    const _params = { ...params(obj.search.slice(1)), ...adds };
    if (Array.isArray(removes)) {
      for (const k of removes) delete params[k];
    }

    const querys = [];
    for (const key of Object.keys(_params)) {
      querys.push(`${ec(key)}=${ec(_params[key])}`);
    }

    if (querys.length) {
      obj.search = `?${querys.join("&")}`;
    } else {
      obj.search = "";
    }

    return `${obj.origin}${obj.pathname}${obj.search}${obj.hash}`;
  };

  // 根据 URL 获取文件名
  const getLocationFile = () => {
    const paths = location.pathname.split("/");
    return paths.pop();
  };

  // 计算正确的返回地址
  const orderURLs = (urlObj, orderId) => {
    const paths = urlObj.pathname.split("/");
    paths.pop();

    const qs = `orderId=${orderId}`;
    const root = `${location.origin}${paths.join("/")}`;

    return {
      returnURL: `${root}/?${qs}`
    };
  };

  // 提醒服务器去验证订单是否已支付
  const orderRemind = async orderId => {
    showLoading("Order remind verify");
    const res = await fetch(`${API_ROOT}/orders/${orderId}/remind`, {
      method: "PUT"
    });

    if (res.status !== 200) throw await res.json();

    hideLoading();
    return res.json();
  };

  // 创建一个订单
  const addOrder = async (name, amount, currency, mobile, gate) => {
    showLoading("Create payment order");
    const body = {
      name,
      amount,
      currency,
      gate
    };
    if (gate === "stcpay") body.mobile = mobile;
    const res = await fetch(`${API_ROOT}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (res.status !== 201) throw await res.json();

    hideLoading();
    return res.json();
  };

  // STCPay 订单确认支付
  const stcPayOrderConfirm = async (order, value) => {
    showLoading("STC pay confirm");
    const res = await fetch(
      `${API_ROOT}/orders/${order.gateOrderId}/stcpay/status/paid`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          value
        })
      }
    );

    if (res.status !== 200) throw await res.json();

    hideLoading();
    return res.json();
  };

  // 获取订单详情
  const orders = async () => {
    showLoading("List orders");
    const res = await fetch(`${API_ROOT}/orders`);

    if (res.status !== 200) throw await res.json();

    hideLoading();
    return res.json();
  };

  const showLoading = msg => {
    if (mode === "debugger") console.log("showLoading: %o", msg);
    $root.setAttribute("class", "loading");
    $loading.innerHTML = `${msg || ""} loading...`;
  };

  const hideLoading = () => {
    $root.setAttribute("class", "none");
  };

  // 显示错误信息
  const showError = e => {
    if (mode === "debugger") console.log("showError: %o", e);
    $root.setAttribute("class", "error");
    $error.innerHTML = `Error info: ${e.message || "unknown"}`;
  };

  // 显示成功信息
  const showSuccess = (order, url) => {
    if (mode === "debugger") console.log("showSuccess: %o, %s", order, url);
    if (url) {
      location.href = url;
    } else {
      $root.setAttribute("class", "success");
      if (typeof order === "string") {
        $success.innerHTML = order;
      } else {
        $success.innerHTML = `Payment succeed: ${order.id}`;
      }
    }
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  return Object.freeze({
    params,
    urlParse,
    modifiyURL,
    orderURLs,
    addOrder,
    orders,
    orderRemind,
    stcPayOrderConfirm,
    showError,
    showSuccess,
    showLoading,
    hideLoading,
    getLocationFile,
    sleep
  });
}

module.exports = Utils;
