import app from "./src/api/server";
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`app listening on port ${port}.`);
});
