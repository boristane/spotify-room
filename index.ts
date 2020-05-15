require("dotenv").config();
require('spm-agent-nodejs');

import app from "./src/server";
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`app listening on port ${port}.`);
});
