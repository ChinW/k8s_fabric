'use strict';
/*
 * Chaincode query
 */
const Fabric_Client = require('fabric-client');
const fs = require('fs');
const path = require('path');
const util = require('util');

const {
  getUserAndCA,
  CHAIN_CODE,
  ORG1_TLS_CA_CERT,
  PEER_ADDR,
  CHANNEL_NAME,
} = require('./common.js');

module.exports = {};
module.exports.query = async (fcn, ...args) => {
  try {
    const {user: user_from_store, fabric_client} = await getUserAndCA('user1');
    console.log('user_from_store', user_from_store);
    if (user_from_store && user_from_store.isEnrolled()) {
      console.log('Successfully loaded user1 from persistence');
    } else {
      throw new Error('Failed to get user1.... run registerUser.js');
    }
    const CHANNEL = fabric_client.newChannel(CHANNEL_NAME);
    const PEER = fabric_client.newPeer(`grpc://${PEER_ADDR}:7051`, {
      'ssl-target-name-override': PEER_ADDR,
      pem: ORG1_TLS_CA_CERT,
    });
    CHANNEL.addPeer(PEER);
    const request = {
      //targets : --- letting this default to the peers assigned to the channel
      chaincodeId: CHAIN_CODE,
      fcn,
      args,
    };
    const query_responses = await CHANNEL.queryByChaincode(request);
    console.log('Query has completed, checking results');
    // query_responses could have more than one results if there multiple peers were used as targets
    if (query_responses && query_responses.length == 1) {
      if (query_responses[0] instanceof Error) {
        console.error('error from query = ', query_responses[0]);
        return 1;
      } else {
        console.log(
          'Response is ',
          query_responses,
          query_responses[0].toString()
        );
        return 0;
      }
    } else {
      console.log('No payloads were returned from query');
      return 1;
    }
  } catch (err) {
    console.error('Failed to query successfully :: ' + err);
    return 1;
  }
};

module.exports.invokeChain = async (fcn, ...args) => {
  try {
    const {user: user_from_store, fabric_client} = await getUserAndCA('user1');
    // console.log('user_from_store', user_from_store);
    if (user_from_store && user_from_store.isEnrolled()) {
      console.log('Successfully loaded user1 from persistence');
    } else {
      throw new Error('Failed to get user1.... run registerUser.js');
    }

    // const fabric_client = new Fabric_Client();
    const CHANNEL = fabric_client.newChannel(CHANNEL_NAME);
    const PEER = fabric_client.newPeer(`grpc://${PEER_ADDR}:7051`, {
      'ssl-target-name-override': PEER_ADDR,
      pem: ORG1_TLS_CA_CERT,
    });

    // Use service discovery to initialize the channel
    await CHANNEL.initialize({
      discover: true,
      asLocalhost: false,
      target: PEER,
    });
    console.log('Used service discovery to initialize the channel');
    const tx_id = fabric_client.newTransactionID();
    console.log(
      util.format('\nCreated a transaction ID: %s', tx_id.getTransactionID())
    );
    const request = {
      //targets : --- letting this default to the peers assigned to the channel
      targets: [PEER],
      chaincodeId: CHAIN_CODE,
      chainId: CHANNEL_NAME,
      txId: tx_id,
      fcn,
      args,
    };

    // const query_responses = await CHANNEL.queryByChaincode(request);
    const endorsement_results = await CHANNEL.sendTransactionProposal(request);
    const proposalResponses = endorsement_results[0];
    const proposal = endorsement_results[1];

    // check the results to decide if we should send the endorsment to be orderered
    if (proposalResponses[0] instanceof Error) {
      console.error(
        'Failed to send Proposal. Received an error :: ' +
          proposalResponses[0].toString()
      );
      throw proposalResponses[0];
    } else if (
      proposalResponses[0].response &&
      proposalResponses[0].response.status === 200
    ) {
      console.log(
        util.format(
          'Successfully sent Proposal and received response: Status - %s',
          proposalResponses[0].response.status
        )
      );
    } else {
      const error_message = util.format(
        'Invoke chaincode proposal:: %j',
        proposalResponses[i]
      );
      console.error(error_message);
      throw new Error(error_message);
    }

    // The proposal was good, now send to the orderer to have the transaction
    // committed.

    const commit_request = {
      proposalResponses: proposalResponses,
      proposal: proposal,
    };
    //Get the transaction ID string to be used by the event processing
    const transaction_id_string = tx_id.getTransactionID();

    // create an array to hold on the asynchronous calls to be executed at the
    // same time
    const promises = [];

    // this will send the proposal to the orderer during the execuction of
    // the promise 'all' call.
    const sendPromise = CHANNEL.sendTransaction(commit_request);
    //we want the send transaction first, so that we know where to check status
    promises.push(sendPromise);

    // get an event hub that is associated with our peer
    let event_hub = CHANNEL.newChannelEventHub(PEER);

    // create the asynchronous work item
    let txPromise = new Promise((resolve, reject) => {
      // setup a timeout of 30 seconds
      // if the transaction does not get committed within the timeout period,
      // report TIMEOUT as the status. This is an application timeout and is a
      // good idea to not let the listener run forever.
      let handle = setTimeout(() => {
        event_hub.unregisterTxEvent(transaction_id_string);
        event_hub.disconnect();
        resolve({event_status: 'TIMEOUT'});
      }, 30000);

      // this will register a listener with the event hub. THe included callbacks
      // will be called once transaction status is received by the event hub or
      // an error connection arises on the connection.
      event_hub.registerTxEvent(
        transaction_id_string,
        (tx, code) => {
          // this first callback is for transaction event status

          // callback has been called, so we can stop the timer defined above
          clearTimeout(handle);

          // now let the application know what happened
          const return_status = {
            event_status: code,
            tx_id: transaction_id_string,
          };
          if (code !== 'VALID') {
            console.error('The transaction was invalid, code = ' + code);
            resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
          } else {
            console.log(
              'The transaction has been committed on peer ' +
                event_hub.getPeerAddr()
            );
            resolve(return_status);
          }
        },
        err => {
          //this is the callback if something goes wrong with the event registration or processing
          reject(new Error('There was a problem with the eventhub ::' + err));
        },
        {disconnect: true} //disconnect when complete
      );

      // now that we have a protective timer running and the listener registered,
      // have the event hub instance connect with the peer's event service
      event_hub.connect();
      console.log(
        'Registered transaction listener with the peer event service for transaction ID:' +
          transaction_id_string
      );
    });

    // set the event work with the orderer work so they may be run at the same time
    promises.push(txPromise);

    // now execute both pieces of work and wait for both to complete
    console.log('Sending endorsed transaction to the orderer');
    const results = await Promise.all(promises);

    // since we added the orderer work first, that will be the first result on
    // the list of results
    // success from the orderer only means that it has accepted the transaction
    // you must check the event status or the ledger to if the transaction was
    // committed
    if (results[0].status === 'SUCCESS') {
      console.log('Successfully sent transaction to the orderer');
    } else {
      const message = util.format(
        'Failed to order the transaction. Error code: %s',
        results[0].status
      );
      console.error(message);
      throw new Error(message);
    }

    if (results[1] instanceof Error) {
      console.error(message);
      throw new Error(message);
    } else if (results[1].event_status === 'VALID') {
      console.log(
        'Successfully committed the change to the ledger by the peer',
        results
      );
      console.log('\n\n - try running "node query" to see the results');
      return proposalResponses[0].response.payload.toString();
    } else {
      const message = util.format(
        'Transaction failed to be committed to the ledger due to : %s',
        results[1].event_status
      );
      console.error(message);
      throw new Error(message);
    }
  } catch (err) {
    console.error('Failed to query successfully :: ' + err);
    return 1;
  }
};
