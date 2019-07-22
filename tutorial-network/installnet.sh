VERSION=0.0.17

composer archive create -t dir -n .

composer network install --card PeerAdmin@hlfv1 --archiveFile tutorial-network@${VERSION}.bna -o npmrcFile=/Users/bangqchi/Programming/cnpm/.cnpmrc

# composer network start --networkName tutorial-network --networkVersion ${VERSION} --networkAdmin admin --networkAdminEnrollSecret adminpw --card PeerAdmin@hlfv1 --file networkadmin.card

composer network upgrade --card PeerAdmin@hlfv1 --networkName tutorial-network --networkVersion ${VERSION} -o npmrcFile=/Users/bangqchi/Programming/cnpm/.cnpmrc


composer-rest-server -c admin@tutorial-network -n never -u true -d tutorial-network -w true