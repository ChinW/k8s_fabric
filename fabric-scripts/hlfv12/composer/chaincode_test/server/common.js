const fs = require('fs');
const path = require('path');
const Fabric_Client = require('fabric-client');
const Fabric_CA_Client = require('fabric-ca-client');

const CHANNEL_NAME = 'composerchannel';
const CHAIN_CODE = 'pdtest12';
const MSP_ID = 'Org1MSP';
const PEER_ADDR = 'peer0.org1';
const CA_URL = 'http://ca-org1-example-com:7054';
const CA_NAME = 'ca-org1-example-com';

const HFC_KEY_PATH = path.join(__dirname, 'hfc-key-store');
const composerPath = path.resolve(
  '../../'
  // 'fabric-dev-servers/fabric-scripts/hlfv12/composer'
);

const ORG1_TLS_CA_CERT_PATH = path.resolve(
  composerPath,
  'crypto-config',
  'peerOrganizations',
  'org1',
  'tlsca',
  'tlsca.org1-cert.pem'
);
const ORG1_TLS_CA_CERT = fs.readFileSync(ORG1_TLS_CA_CERT_PATH, 'utf8');

console.log('Store path:' + HFC_KEY_PATH);
console.log('ORG1_TLS_CA_CERT', ORG1_TLS_CA_CERT);

const getUserAndCA = async (userName, needCA = true) => {
  const fabric_client = new Fabric_Client();

  // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
  const state_store = await Fabric_Client.newDefaultKeyValueStore({
    path: HFC_KEY_PATH,
  });
  // assign the store to the fabric client
  fabric_client.setStateStore(state_store);
  const crypto_suite = Fabric_Client.newCryptoSuite();
  // use the same location for the state store (where the users' certificate are kept)
  // and the crypto store (where the users' keys are kept)
  const crypto_store = Fabric_Client.newCryptoKeyStore({
    path: HFC_KEY_PATH,
  });
  crypto_suite.setCryptoKeyStore(crypto_store);
  fabric_client.setCryptoSuite(crypto_suite);
  const tlsOptions = {
    trustedRoots: [ORG1_TLS_CA_CERT],
    verify: false,
  };
  // be sure to change the http to https when the CA is running TLS enabled
  fabric_ca_client = new Fabric_CA_Client(
    CA_URL,
    tlsOptions,
    CA_NAME,
    crypto_suite
  );
  const user = await fabric_client.getUserContext(userName, true);
  return {
    user,
    fabric_client,
    fabric_ca_client,
  };
};

module.exports = {
  CHANNEL_NAME,
  ORG1_TLS_CA_CERT,
  CA_NAME,
  CA_URL,
  HFC_KEY_PATH,
  MSP_ID,
  CHAIN_CODE,
  PEER_ADDR,
  getUserAndCA,
};
