/* ============================================================
 * node.bittrex.api
 * https://github.com/n0mad01/node.bittrex.api
 *
 * ============================================================
 * Copyright 2014-2015, Adrian Soluch - http://soluch.us/
 * Released under the MIT License
 * ============================================================ */
var NodeBittrexApi = function() {

  'use strict';

  var request = require('request'),
    hmac_sha512 = require('./hmac-sha512.js'),
    JSONStream = require('JSONStream'),
    es = require('event-stream');

  var start,
    request_options = {
      method: 'GET',
      agent: false,
      headers: {
        "User-Agent": "Mozilla/4.0 (compatible; Node Bittrex API)",
        "Content-type": "application/x-www-form-urlencoded"
      }
    };

  var opts = {
    baseUrl: 'https://bittrex.com/api/v1.1',
    apikey: 'APIKEY',
    apisecret: 'APISECRET',
    verbose: false,
    cleartext: false,
    stream: false
  };

  var getNonce = function() {
    return Math.floor(new Date().getTime() / 1000);
  };

  var extractOptions = function(options) {
    var o = Object.keys(options),
      i;
    for (i = 0; i < o.length; i++) {
      opts[o[i]] = options[o[i]];
    }
  };

  var apiCredentials = function(uri) {

    var options = {
      apikey: opts.apikey,
      nonce: getNonce()
    };

    return setRequestUriGetParams(uri, options);
  };

  var setRequestUriGetParams = function(uri, options) {
    var op;
    if (typeof (uri) === 'object') {
      op = uri;
      uri = op.uri;
    } else {
      op = request_options;
    }

    var o = Object.keys(options),
      i;
    for (i = 0; i < o.length; i++) {
      uri = updateQueryStringParameter(uri, o[i], options[o[i]]);
    }

    op.headers.apisign = hmac_sha512.HmacSHA512(uri, opts.apisecret); // setting the HMAC hash `apisign` http header
    op.uri = uri;

    return op;
  };

  var updateQueryStringParameter = function(uri, key, value) {

    var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
    var separator = uri.indexOf('?') !== -1 ? "&" : "?";

    if (uri.match(re)) {
      uri = uri.replace(re, '$1' + key + "=" + value + '$2');
    } else {
      uri = uri + separator + key + "=" + value;
    }

    return uri;
  };

  var sendRequestCallback = function(op, callback) {
    callback = callback || function() {};
    start = Date.now();

    return new Promise(function(resolve, reject) {
      if (opts.stream) {
        request(op)
          .pipe(JSONStream.parse())
          .pipe(es.mapSync(function(data) {
            callback(null, data);
            ((opts.verbose) ? console.log("streamed from " + op.uri + " in: %ds", (Date.now() - start) / 1000) : '');
          }));
      } else {
        request(op, function(error, result, body) {
          if (!body || !result || result.statusCode != 200 || !result.success) {
            var err = error || new Error(result ? result.message : 'An unknown error occurred when performing API request');
            console.error(err);
            reject(err);
            callback(err);
          } else {
            const parsedBody = JSON.parse(body);
            var ret = ((opts.cleartext) ? JSON.stringify(body.result) : parsedBody.result);
            ((opts.verbose) ? console.log("requested from " + result.request.href + " in: %ds", (Date.now() - start) / 1000) : '');
            resolve(ret);
            callback(error, ret);
          }
        });
      }
    });
  };

  return {

    options: function(options) {
      extractOptions(options);
    },
    
    sendCustomRequest: function(request_string, callback, credentials) {
      var op;

      if (credentials === true) {
        op = apiCredentials(request_string);
      } else {
        op = request_options;
        op.uri = request_string;
      }
      return sendRequestCallback(op, callback);
    },
    
    getMarkets: function(callback) {
      var op = request_options;
      op.uri = opts.baseUrl + '/public/getmarkets';
      return sendRequestCallback(op, callback);
    },
    
    getCurrencies: function(callback) {
      var op = request_options;
      op.uri = opts.baseUrl + '/public/getcurrencies';
      return sendRequestCallback(op, callback);
    },
    
    getTicker: function(options, callback) {
      var op = setRequestUriGetParams(opts.baseUrl + '/public/getticker', options);
      return sendRequestCallback(op, callback);
    },
    
    getMarketSummaries: function(callback) {
      var op = request_options;
      op.uri = opts.baseUrl + '/public/getmarketsummaries';
      return sendRequestCallback(op, callback);
    },
    
    getMarketSummary: function(options, callback) {
      var op = setRequestUriGetParams(opts.baseUrl + '/public/getmarketsummary', options);
      return sendRequestCallback(op, callback);
    },
    
    getOrderBook: function(options, callback) {
      var op = setRequestUriGetParams(opts.baseUrl + '/public/getorderbook', options);
      return sendRequestCallback(op, callback);
    },
    
    getMarketHistory: function(options, callback) {
      var op = setRequestUriGetParams(opts.baseUrl + '/public/getmarkethistory', options);
      return sendRequestCallback(op, callback);
    },
    
    buyLimit: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/market/buylimit'), options);
      return sendRequestCallback(op, callback);
    },

    buyMarket: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/market/buymarket'), options);
      return sendRequestCallback(op, callback);
    },
    
    sellLimit: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/market/selllimit'), options);
      return sendRequestCallback(op, callback);
    },
    
    sellMarket: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/market/sellmarket'), options);
      return sendRequestCallback(op, callback);
    },
    
    cancel: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/market/cancel'), options);
      return sendRequestCallback(op, callback);
    },
    
    getOpenOrders: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/market/getopenorders'), options);
      return sendRequestCallback(op, callback);
    },
    
    getBalances: function(callback) {
      var op = apiCredentials(opts.baseUrl + '/account/getbalances');
      return sendRequestCallback(op, callback);
    },
    
    getBalance: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/account/getbalance'), options);
      return sendRequestCallback(op, callback);
    },
    
    getWithdrawalHistory: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/account/getwithdrawalhistory'), options);
      return sendRequestCallback(op, callback);
    },
    
    getDepositAddress: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/account/getdepositaddress'), options);
      return sendRequestCallback(op, callback);
    },
    
    getDepositHistory: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/account/getdeposithistory'), options);
      return sendRequestCallback(op, callback);
    },
    
    getOrderHistory: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/account/getorderhistory'), options);
      return sendRequestCallback(op, callback);
    },
    
    getOrder: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/account/getorder'), options);
      return sendRequestCallback(op, callback);
    },
    
    withdraw: function(options, callback) {
      var op = setRequestUriGetParams(apiCredentials(opts.baseUrl + '/account/withdraw'), options);
      return sendRequestCallback(op, callback);
    }

  };

}();

module.exports = NodeBittrexApi;
