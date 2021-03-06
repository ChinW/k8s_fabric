const shim = require('fabric-shim');
const util = require('util');

const {POS} = require('./template.js');

const HISTORY_TYPE = {
  NONE: 'NONE',
  LATEST_BY_DATE: 'LATEST_BY_DATE',
  ALL_BY_DATE: 'ALL_BY_DATE',
  ALL: 'ALL',
};

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

  async putWallet(stub, data, tx) {
    data.triggerMan = tx;
    data.recordType = 'W';
    return await stub.putState(data.id, Buffer.from(JSON.stringify(data)));
  }

  async updateBook(stub, position, delta, tx) {
    let newBook = null;
    try {
      const bookname = position.pty;
      const bookBytes = await stub.getState(bookname);
      if (!bookBytes || bookBytes.toString().length <= 0) {
        newBook = {
          id: bookname,
          recordType: 'B',
          positions: [position.id],
          value: delta,
          updatedAt: new Date(),
          triggerMan: tx,
        };
      } else {
        newBook = JSON.parse(bookBytes.toString());
        newBook.value += delta;
        newBook.updatedAt = new Date();
        newBook.triggerMan = tx;
      }
      await stub.putState(newBook.id, Buffer.from(JSON.stringify(newBook)));
      return 0;
    } catch (e) {
      console.log('error in updateBook', e);
      return 1;
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
      if (!walletBytes || walletBytes.toString().length <= 0) {
        console.log('creating wallet', walletId);
        let newWallet = Object.assign({}, POS, {
          id: walletId,
          pty,
          cpty,
          name,
          type,
          value: 0,
          updatedAt: new Date(),
        });
        await this.putWallet(stub, newWallet);
        // const tmp = await stub.getState(walletId);
        // console.log('tmp value ', tmp, tmp.toString());
        walletBytes = Buffer.from(JSON.stringify(newWallet));
      }
      const wallet = JSON.parse(walletBytes.toString());
      return wallet;
    } catch (e) {
      console.error('error in get wallet', e);
    }
  }

  async createNew(stub, args) {
    const obj = JSON.parse(args);
    try {
      await stub.putState(
        obj.id,
        Buffer.from(JSON.stringify(Object.assign({}, POS, obj)))
      );
      return 0;
    } catch (e) {
      console.error('error in createNew', e);
      return 1;
    }
  }

  async getHistory(stub, key) {
    console.info('- start getHistory: %s\n', key);

    let resultsIterator = await stub.getHistoryForKey(key);
    let results = await this.getAllResults(resultsIterator);

    return results;
  }

  async newTransaction(stub, txStr) {
    const tx = JSON.parse(txStr);
    tx.txId = stub.getTxID();
    const {pty, cpty, name, type, delta, updatedAt} = tx;
    let ptyWallet = await this.getWallet(
      stub,
      {
        pty: pty,
        cpty,
        name,
        type,
      },
      tx
    );
    let cptyWallet = await this.getWallet(
      stub,
      {
        pty: cpty,
        cpty: pty,
        name,
        type,
      },
      tx
    );

    try {
      await this.putWallet(
        stub,
        Object.assign({}, ptyWallet, {
          value: ptyWallet.value - delta,
          updatedAt,
        }),
        tx
      );
      await this.updateBook(stub, ptyWallet, -delta, tx);
      await this.putWallet(
        stub,
        Object.assign({}, cptyWallet, {
          value: cptyWallet.value + delta,
          updatedAt,
        }),
        tx
      );
      await this.updateBook(stub, cptyWallet, delta, tx);
      return 0;
    } catch (e) {
      console.error('updating error', e);
      return 1;
    }
  }

  async getAllResults(iterator) {
    let allResults = [];
    while (true) {
      let res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        console.log('res', res);
        let jsonRes = JSON.parse(res.value.value.toString('utf8'));
        jsonRes._metaData = {
          key: res.value.key,
          txId: res.value.tx_id,
          timestamp: res.value.timestamp,
          isDeleted: res.value.is_delete ? res.value.is_delete.toString() : 0,
        };
        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('getAllResults end');
        await iterator.close();
        return allResults;
      }
    }
  }

  // historyType: null/latest/all
  async stateQuery(
    stub,
    queryString,
    historyType = HISTORY_TYPE.NONE,
    byDate = '' // needed if historyType is not none
  ) {
    console.info(
      'StateQuery queryString:\n' + queryString + 'limit date ' + byDate
    );
    let resultsIterator = await stub.getQueryResult(queryString);
    let results = await this.getAllResults(resultsIterator);
    if (historyType !== HISTORY_TYPE.NONE && results.length) {
      const keys = results.map(i => i.Value.id);
      const historySetReqs = keys.map(key => this.getHistory(stub, key, true));
      const historySet = await Promise.all(historySetReqs);
      let dataResults = [];
      historySet.map(historicalItems => {
        console.log('historicalItems', historicalItems.length);
        if (
          [HISTORY_TYPE.ALL_BY_DATE, HISTORY_TYPE.LATEST_BY_DATE].includes(
            historyType
          )
        ) {
          const limitDate = new Date(byDate);
          for (let i = 0; i < historicalItems.length; i++) {
            const thisDate = new Date(historicalItems[i].Value.updatedAt);
            console.log('thisDate', thisDate, limitDate, thisDate <= limitDate);
            if (i === historicalItems.length - 1 || thisDate <= limitDate) {
              dataResults.push(historicalItems[i]);
              if (historyType === HISTORY_TYPE.LATEST_BY_DATE) {
                break;
              }
            }
          }
        } else if (historyType === HISTORY_TYPE.ALL) {
          dataResults = dataResults.concat(historicalItems);
        }
      });
      return dataResults;
    }
    return results;
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
        const result = await this[ret.fcn](stub, ...ret.params);
        return shim.success(Buffer.from(JSON.stringify(result)));
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
