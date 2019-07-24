# remove old service
kubectl delete deployment/ca-org1-example-com --namespace=org1
kubectl delete deployment/couchdb --namespace=org1
kubectl delete deployment/orderer-example-com --namespace=orderer-org
kubectl delete deployment/peer0-org1-example-com --namespace=org1
kubectl delete deployment/cli --namespace=org1

kubectl delete service/ca-org1-example-com --namespace=org1
kubectl delete service/couchdb --namespace=org1
kubectl delete service/orderer --namespace=orderer-org
kubectl delete service/peer0 --namespace=org1

# create deployments and services
kubectl apply -f namespace.yaml
kubectl apply -f couchdb.yaml
kubectl apply -f ca.yaml
kubectl apply -f orderer.yaml
kubectl apply -f peer.yaml
kubectl apply -f cli.yaml
