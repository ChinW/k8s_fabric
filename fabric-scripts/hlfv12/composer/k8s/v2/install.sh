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
export CHAINCODE_NAME="mycc"
export CHAINCODE_VERSION="2.0"

# dev: run chaincode in peer
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_ADDRESS=127.0.0.1:7052 CORE_CHAINCODE_ID_NAME=${CHAINCODE_NAME}:${CHAINCODE_VERSION} ./chaincode-ex02

# install: go
peer chaincode install -n ${CHAINCODE_NAME} -v ${CHAINCODE_VERSION} -p chaincode_example02/

# for non-dev mode
peer chaincode instantiate -o ${ORDERER} -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -v ${CHAINCODE_VERSION} -P "AND('Org1MSP.member')" -c '{"Args":["init","a","400","b","300"]}'

peer chaincode invoke -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{"Args":["invoke","a","b","50"]}'

peer chaincode invoke -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{"Args":["invoke","dummy"]}'

peer chaincode query -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{"Args":["query","a"]}'

