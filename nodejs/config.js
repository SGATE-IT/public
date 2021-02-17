const storagePath = __dirname;

module.exports = {
  sdk: {
    root: process.env.GATE_API_ROOT || "https://club.sgate.sa/api_v1",
    userId: process.env.CASE_USER_ID | 0,
    clientId: process.env.CASE_CLIENT_ID | 0,
    key: process.env.CASE_CLIENT_KEY,
    secret: process.env.CASE_CLIENT_SECRET
  },
  site: process.env.CASE_SITE_URL,
  api: process.env.CASE_SITE_API || `${process.env.CASE_SITE_URL}/api_v1`,
  logger: {
    name: "opay-nodejs-cases",
    errorLogPath: `${storagePath}/logs`,
    infoLogPath: `${storagePath}/logs`
  }
};
