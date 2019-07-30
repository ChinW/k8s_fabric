class TES {
  async a(test) {
    return new Promise(resolve => {
      setTimeout(() => {
        return resolve(test);
      }, 2000);
    });
  }
}

test = new TES();
test.a(12324);
console.log(2);

walletBytes = Buffer.from(JSON.stringify({a: 12, b: 23, c: 3}));
console.log(walletBytes.toString());
