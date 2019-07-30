# create channel
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/chaincode/crypto-config/peerOrganizations/org1/peers/peer0.org1/msp
export CORE_PEER_LOCALMSPID="Org1MSP"
export CHANNEL_NAME=composerchannel
export CORE_PEER_NETWORKID="nid1"
export ORDERER=orderer.orderer-org:7050
peer channel create -o ${ORDERER} -c ${CHANNEL_NAME} -f ./composer-channel.tx

# export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/chaincode/crypto-config/peerOrganizations/org1/users/Admin@org1/msp
export CORE_PEER_LOCALMSPID="Org1MSP" #this matters
export CORE_PEER_MSPID="Org1MSP"

peer channel fetch newest -o ${ORDERER} -c ${CHANNEL_NAME}
peer channel join -b ${CHANNEL_NAME}_newest.block

# install
export CHAINCODE_NAME="pdtest14"
export CHAINCODE_VERSION="1.0"
export PATH=/etc/nodejs/bin:$PATH;
CORE_CHAINCODE_LOGLEVEL=debug CORE_CHAINCODE_ID_NAME=${CHAINCODE_NAME}:${CHAINCODE_VERSION} node index.js --peer.address 127.0.0.1:7052

# dev: run chaincode in peer
CORE_CHAINCODE_LOGLEVEL=debug CORE_CHAINCODE_ID_NAME=${CHAINCODE_NAME}:${CHAINCODE_VERSION} node index.js --peer.address 127.0.0.1:7052

# install: node
cp -r chaincode_test/ $GOPATH/src;

cp -r chaincode_test/chaincode $GOPATH/src/chaincode_test;
peer chaincode install -l node -n ${CHAINCODE_NAME} -v ${CHAINCODE_VERSION} -p chaincode_test/
peer chaincode instantiate  -o ${ORDERER} -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -v ${CHAINCODE_VERSION} -l node -c '{"Args":["init"]}' -P "AND('Org1MSP.member')"
peer chaincode invoke -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{"Args":["newTransaction","{\"pty\":\"BOOK 1\",\"cpty\":\"BOOK 2\",\"name\":\"700 HK\",\"type\":\"P\",\"delta\":230,\"updatedAt\":\"2019-07-29T09:44:41.246Z\"}"]}'


peer chaincode invoke -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{"Args":["createNew","{\"id\":\"BOOK 1\",\"cpty\":\"BOOK 2\",\"name\":\"700 HK\",\"type\":\"P\",\"delta\":230,\"updatedAt\":\"2019-07-29T09:44:41.246Z\"}"]}'


peer chaincode invoke -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{"Args":["invoke","a","b","50"]}'

peer chaincode invoke -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{"Args":["newTransaction","{\"pty\":\"BOOK 1\",\"cpty\":\"BOOK 2\",\"name\":\"700 HK\",\"type\":\"P\",\"delta\":230,\"updatedAt\":\"2019-07-29T09:44:41.246Z\"}"]}'

peer chaincode query -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{"Args":["query","a"]}'


# custom query

peer chaincode invoke -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{"Args":["stateQuery","{\"selector\":{\"pty\":\"BOOK 1\"}}"]}'

