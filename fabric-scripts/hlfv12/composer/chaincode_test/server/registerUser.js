'use strict';
/*
 * Register and Enroll a user
 */
const Fabric_Client = require('fabric-client');
const {HFC_KEY_PATH, MSP_ID, getUserAndCA} = require('./common.js');

module.exports = {};
module.exports.registerUser = async () => {
  let fabric_client = new Fabric_Client();
  let admin_user = null;
  let member_user = null;
  try {
    const {user: user_from_store, fabric_ca_client} = await getUserAndCA(
      'admin'
    );
    if (user_from_store && user_from_store.isEnrolled()) {
      console.log('Successfully loaded admin from persistence');
      admin_user = user_from_store;
    } else {
      throw new Error('Failed to get admin.... run enrollAdmin.js');
    }
    const secret = await fabric_ca_client.register(
      {
        enrollmentID: 'user1',
        affiliation: 'org1.department1',
        role: 'client',
      },
      admin_user
    );
    console.log('Successfully registered user1 - secret:' + secret);
    const enrollment = await fabric_ca_client.enroll({
      enrollmentID: 'user1',
      enrollmentSecret: secret,
    });
    console.log('Successfully enrolled member user "user1" ');
    const user = fabric_client.createUser({
      username: 'user1',
      mspid: MSP_ID,
      cryptoContent: {
        privateKeyPEM: enrollment.key.toBytes(),
        signedCertPEM: enrollment.certificate,
      },
    });
    member_user = user;
    await fabric_client.setUserContext(member_user);
    console.log(
      'User1 was successfully registered and enrolled and is ready to interact with the fabric network'
    );
    return 0;
  } catch (err) {
    console.error('Failed to register: ' + err);
    if (err.toString().indexOf('Authorization') > -1) {
      console.error(
        'Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
          'Try again after deleting the contents of the store directory ' +
          HFC_KEY_PATH
      );
    }
    return 1;
  }
};
