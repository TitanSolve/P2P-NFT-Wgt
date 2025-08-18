const API_URLS = {
  backendUrl: process.env.REACT_APP_BACKEND_URL,
  accesstoken: process.env.REACT_APP_SYNAPSE_ACCESS_TOKEN,
  synapseUrl: process.env.REACT_APP_SYNAPSE_URL,
  marketPlace: process.env.REACT_APP_MARKETPLACE_URL,
  elementsUrl: process.env.REACT_APP_ELEMENTS_URL,
  xrplMainnetUrl: process.env.REACT_APP_XRPL_MAIN_NET_URL,
  xrplTestnetUrl: process.env.REACT_APP_XRPL_TEST_NET_URL,
  brokerWalletAddress: process.env.REACT_APP_BROKER_WALLET_ADDRESS,
  systemWalletAddress: process.env.REACT_APP_SYSTEM_WALLET_ADDRESS,
  bithompToken: process.env.REACT_APP_BITHOMP_TOKEN,
};

export default API_URLS;
