require("dotenv").config();

import app from "./src/server";
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`app listening on port ${port}.`);
});
