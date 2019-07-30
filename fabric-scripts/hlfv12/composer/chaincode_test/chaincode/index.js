const shim = require('fabric-shim');
const util = require('util');

const {POS} = require('./template.js');

class Chaincode {
  async Init(stub) {
    try {
      await stub.putState('init', Buffer.from('init-value'));
      console.info('Chaincode instantiation is successful');
      return shim.success();
    } catch (e) {
      console.log('Error in init', e);
      return shim.error();
    }
  }

  async getWallet(stub, options) {
    const {pty, cpty, name, type} = options;
    const walletId =
      type === 'S'
        ? `${pty}__${cpty}#${name}#${type}`
        : `${pty}_#${name}#${type}`;
    console.log('search wallet id', walletId);
    try {
      let walletBytes = await stub.getState(walletId);
      console.log('walletBytes', walletBytes);
      if (!walletBytes || walletBytes.toString().length <= 0) {
        console.log('creating wallet', walletId);
        let newWallet = Object.assign({}, POS, {
          id: walletId,
          pty,
          cpty,
          name,
          type,
          value: 0,
          // updatedAt: new Date(),
        });
        await stub.putState(walletId, Buffer.from(JSON.stringify(newWallet)));
        const tmp = await stub.getState(walletId);
        console.log('tmp value ', tmp, tmp.toString());
        walletBytes = Buffer.from(JSON.stringify(newWallet));
      }
      console.log('comes here', walletBytes, walletBytes.toString());
      const wallet = JSON.parse(walletBytes.toString());
      console.log('get wallet', wallet);
      return wallet;
    } catch (e) {
      console.error('error in get wallet', e);
    }
  }

  async createNew(stub, args) {
    const obj = JSON.parse(args);
    console.log('obj', obj);
    try {
      await stub.putState(
        obj.id,
        Buffer.from(JSON.stringify(Object.assign({}, POS, obj)))
      );
    } catch (e) {
      console.error('error in createNew', e);
    }
  }

  async newTransaction(stub, args) {
    const {pty, cpty, name, type, delta, updatedAt} = JSON.parse(args);
    let ptyWallet = await this.getWallet(stub, {
      pty: pty,
      cpty,
      name,
      type,
    });
    let cptyWallet = await this.getWallet(stub, {
      pty: cpty,
      cpty: pty,
      name,
      type,
    });

    try {
      await stub.putState(
        ptyWallet.id,
        Buffer.from(
          JSON.stringify(
            Object.assign({}, ptyWallet, {
              value: ptyWallet.value - delta,
              updatedAt,
            })
          )
        )
      );
      await stub.putState(
        cptyWallet.id,
        Buffer.from(
          JSON.stringify(
            Object.assign({}, cptyWallet, {
              value: cptyWallet.value + delta,
              updatedAt,
            })
          )
        )
      );
      return 0;
    } catch (e) {
      console.error('updating error', e);
      return 1;
    }
  }

  /**
   * Invoke by function based
   * e.g. ["action1", "arg1", "arg2", ... , "argX"]
   * @param {any} stub
   */
  async Invoke(stub) {
    console.info('Transaction ID: ' + stub.getTxID());
    console.info(util.format('Args: %j', stub.getArgs()));

    let ret = stub.getFunctionAndParameters();
    console.info('ret', ret);
    if (typeof this[ret.fcn] === 'function') {
      try {
        await this[ret.fcn](stub, ...ret.params);
        return shim.success();
      } catch (e) {
        console.error('error in invoking', e);
        return shim.error();
      }
    }
    console.error('Error in finding function', stub.getArgs());
    return shim.error();
  }
}

shim.start(new Chaincode());
