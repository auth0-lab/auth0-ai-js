var express = require('express');
var router = express.Router();

router.post('/', function(req, res, next) {
  if (!req.headers.authorization) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Bearer scope="openid buy.stock"');
    return res.json({ ok: false });
  }
  
  return res.json({ ok: true });
});

module.exports = router;
