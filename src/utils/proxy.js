/**
 * Get proxy configuration from environment
 * @returns {object|null} Proxy configuration or null if disabled
 */
function getProxyConfig() {
  const proxyEnabled = process.env.PROXY_ENABLED === 'true';
  
  if (!proxyEnabled) {
    return null;
  }
  
  const proxyHost = process.env.PROXY_HOST;
  const proxyPort = process.env.PROXY_PORT;
  
  if (!proxyHost || !proxyPort) {
    console.warn('Proxy enabled but missing host or port');
    return null;
  }
  
  const config = {
    host: proxyHost,
    port: parseInt(proxyPort, 10)
  };
  
  // Add authentication if provided
  const proxyUsername = process.env.PROXY_USERNAME;
  const proxyPassword = process.env.PROXY_PASSWORD;
  
  if (proxyUsername && proxyPassword) {
    config.auth = {
      username: proxyUsername,
      password: proxyPassword
    };
  }
  
  return config;
}

/**
 * Get proxy URL string
 * @returns {string|null} Proxy URL or null
 */
function getProxyUrl() {
  const config = getProxyConfig();
  
  if (!config) {
    return null;
  }
  
  let url = `http://${config.host}:${config.port}`;
  
  if (config.auth) {
    url = `http://${config.auth.username}:${config.auth.password}@${config.host}:${config.port}`;
  }
  
  return url;
}

/**
 * Get proxy object for axios
 * @returns {object|undefined} Axios proxy config or undefined
 */
function getAxiosProxy() {
  const config = getProxyConfig();
  
  if (!config) {
    return undefined;
  }
  
  return {
    host: config.host,
    port: config.port,
    auth: config.auth
  };
}

module.exports = {
  getProxyConfig,
  getProxyUrl,
  getAxiosProxy
};
