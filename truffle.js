module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 15000000
    },
    kovan: {
      from: '0x00406dd474c5755f4a5af91c5363a1227aa7cf2a',
      host: "localhost",
      port: 8545, 
      network_id: 42
    }
  }
};
