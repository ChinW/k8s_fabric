'use strict';
/*
 * Enroll the admin user
 */

const Fabric_Client = require('fabric-client');
const {MSP_ID, getUserAndCA} = require('./common.js');

module.exports = {};
module.exports.enrollAdmin = async () => {
  let fabric_client = new Fabric_Client();
  let admin_user = null;
  try {
    const {user: user_from_store, fabric_ca_client} = await getUserAndCA(
      'admin'
    );
    console.log('user_from_store', user_from_store);
    if (user_from_store && user_from_store.isEnrolled()) {
      console.log('Successfully loaded admin from persistence');
      admin_user = user_from_store;
    } else {
      await fabric_ca_client
        .enroll({
          enrollmentID: 'admin',
          enrollmentSecret: 'adminpw',
        })
        .then(enrollment => {
          console.log('Successfully enrolled admin user "admin"');
          return fabric_client.createUser({
            username: 'admin',
            mspid: MSP_ID,
            cryptoContent: {
              privateKeyPEM: enrollment.key.toBytes(),
              signedCertPEM: enrollment.certificate,
            },
          });
        })
        .then(user => {
          admin_user = user;
          return fabric_client.setUserContext(admin_user);
        })
        .catch(err => {
          console.error(
            'Failed to enroll and persist admin. Error: ' + err.stack
              ? err.stack
              : err
          );
          throw new Error('Failed to enroll admin');
        });
    }
    console.log(
      'Assigned the admin user to the fabric client ::' + admin_user.toString()
    );
    return 0;
  } catch (err) {
    console.error('Failed to enroll admin: ' + err);
    return 1;
  }
};
