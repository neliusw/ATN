// trust-node - ATN REST API server

import express from 'express';

const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
  res.json({ message: 'ATN Trust Node v0.1.0' });
});

app.listen(PORT, () => {
  console.log(`Trust Node listening on port ${PORT}`);
});

export default app;
