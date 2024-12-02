var express = require('express');
var router = express.Router();

router.post('/', function(req, res, next) {
  console.log('API request...');
  console.log(req.body)
});

module.exports = router;
