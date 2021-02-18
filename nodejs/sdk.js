const crypto = require("crypto");

function SDK({ root, userId, clientId, key, secret }, { _, axios }) {
  // 签名计算公式
  const generator = _opt => {
    const opt = { ..._opt, signMethod: "HmacSHA256", signVersion: "1" };
    const string = _.map(opt, (v, k) => `${k}=${encodeURIComponent(v)}`)
      .sort()
      .join("&");
    const h = crypto.createHmac("sha256", secret);
    return h.update(string).digest("base64");
  };

  // 计算签名头部信息
  const headers = (uri, method) => {
    const opt = {
      uri,
      key,
      timestamp: (Date.now() / 1000) | 0,
      signMethod: "HmacSHA256",
      signVersion: "1",
      method
    };

    return {
      "x-auth-signature": generator(opt, secret),
      "x-auth-key": key,
      "x-auth-method": method,
      "x-auth-timestamp": opt.timestamp,
      "x-auth-sign-method": opt.signMethod,
      "x-auth-sign-version": opt.signVersion
    };
  };

  /** 创建订单 */
  const create = async params => {
    const uri = `/users/${userId}/orders`;

    params.clientId = clientId;
    const { data } = await axios.post(`${root}${uri}`, params, {
      headers: headers(uri, "user.addOrder")
    });

    return data;
  };

  /** 查看订单 */
  const detail = async orderId => {
    const uri = `/orders/${orderId}`;

    const { data } = await axios.get(`${root}${uri}`, {
      headers: headers(uri, "order.detail")
    });

    return data;
  };

  /** 验证签名是否合法 */
  const verify = (opt, signature) => {
    if (opt.key !== key) return false;
    // 时间差异必须要小于100秒
    if (100 < Math.abs((opt.timestamp - Date.now() / 1000) | 0)) return false;
    return generator(opt) === signature;
  };

  /** stcpay 订单确认 */
  const stcPayConfirm = async (orderId, ticket, OtpValue) => {
    const uri = `/orders/${orderId}/complete`;

    const { data } = await axios.put(
      `${root}${uri}`,
      { ticket, info: { OtpValue } },
      {
        headers: headers(uri, "order.complete")
      }
    );

    return data;
  };

  return { create, verify, detail, stcPayConfirm };
}

module.exports = SDK;
