const express = require('express');
const app = express();

const {enrollAdmin} = require('./enrollAdmin.js');
const {registerUser} = require('./registerUser.js');
const {invokeChain} = require('./service.js');

const init = async () => {
  await enrollAdmin('admin');
  await registerUser('user1');
  return 0;
};

const start = async () => {
  await invokeChain(
    'createNew',
    JSON.stringify({
      id: 'BOOK 2-test',
      cpty: 'BOOK 2',
      delta: 230,
      pty: 'BOOK 1',
      name: '700 HK',
      type: 'P',
      updatedAt: '2019-07-29T09:44:41.246Z',
    })
  );
};
app.use(express.json());
app.post('/invoke', async (req, res) => {
  console.log('req', req.body);
  const payload = req.body;
  const result = await invokeChain(payload.fcn, JSON.stringify(payload.data));
  res.send(`result: ${result}`);
});

app.listen(8889, async () => {
  await init();
  console.log('Example app listening on port 8889!');
});

// start();
