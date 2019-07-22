k delete deployment/ca-org1-example-com
k delete deployment/couchdb
k delete deployment/orderer-example-com
k delete deployment/peer0-org1-example-com

k delete service/ca-org1-example-com
k delete service/couchdb
k delete service/orderer-example-com
k delete service/peer0-org1-example-com


k apply -f ca-org1-example-com-deployment.yaml