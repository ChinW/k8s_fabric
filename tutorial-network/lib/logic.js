/**
 * Track the trade of a commodity from one trader to another
 * @param {org.example.mynetwork.Trade} trade - the trade to be processed
 * @transaction
 */
async function tradeCommodity(trade) {
  trade.commodity.owner = trade.newOwner;
  let assetRegistry = await getAssetRegistry('org.example.mynetwork.Commodity');
  await assetRegistry.update(trade.commodity);
}

/**
 * exchange function
 * @param {org.example.mynetwork.Exchange} exchange
 * @transaction
 */
async function exchangeBook(exchange) {
  exchange.prevBook.quantity =
    exchange.prevBook.quantity + exchange.quantityDiff;
  exchange.prevBook.latestTransactionId = exchange.transactionId;
  exchange.prevBook.snap = exchange;
  if (exchange.prevBook.bookName !== exchange.currentBook.bookName) {
    exchange.currentBook.quantity =
      exchange.currentBook.quantity - exchange.quantityDiff;
  }
  exchange.currentBook.latestTransactionId = exchange.transactionId;
  exchange.currentBook.snap = exchange;
  let assetRegistry = await getAssetRegistry('org.example.mynetwork.Book');
  await assetRegistry.update(exchange.prevBook);
  if (exchange.prevBook.bookName !== exchange.currentBook.bookName) {
    await assetRegistry.update(exchange.currentBook);
  }
}

/**
 * exchange function
 * @param {org.example.mynetwork.HistoryTransaction} transaction
 * @returns {org.example.mynetwork.Book[]} All the assets.
 * @transaction
 */
async function simpleNativeHistoryTransaction(transaction) {
  const id = transaction.assetId;
  const nativeSupport = transaction.nativeSupport;

  const nativeKey = getNativeAPI().createCompositeKey(
    'Asset:org.example.mynetwork.Book',
    [id]
  );
  const iterator = await getNativeAPI().getHistoryForKey(nativeKey);
  let results = [];
  let res = {done: false};
  while (!res.done) {
    res = await iterator.next();

    if (res && res.value && res.value.value) {
      let val = res.value.value.toString('utf8');
      if (val.length > 0) {
        results.push(getSerializer().fromJSON(JSON.parse(val)));
      }
    }
    if (res && res.done) {
      try {
        iterator.close();
      } catch (err) {}
    }
  }
  return results;
}
