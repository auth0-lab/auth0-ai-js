const express = require("express");
const bodyParser = require("body-parser");
const { auth, requiredScopes } = require("express-oauth2-jwt-bearer");

require("dotenv").config();

const app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

const checkJwt = auth({
  audience: process.env.AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  // algorithms: ["RS256"],
});

app.post("/", checkJwt, requiredScopes(["openid"]), (req, res) => {
  res.status(200).send({ message: "Stock purchase request received" });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
