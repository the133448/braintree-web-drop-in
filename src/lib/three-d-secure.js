'use strict';

var threeDSecure = require('braintree-web/three-d-secure');

var DEFAULT_ACS_WINDOW_SIZE = '03';

function ThreeDSecure(authorization, merchantConfiguration) {
  this._authorization = authorization;
  this._config = merchantConfiguration;
}

ThreeDSecure.prototype.initialize = function () {
  var self = this;

  return threeDSecure.create({
    authorization: this._authorization,
    version: 2
  }).then(function (instance) {
    self._instance = instance;
  });
};

ThreeDSecure.prototype.verify = function (payload, merchantProvidedData) {
  var verifyOptions = Object.assign({
    amount: this._config.amount
  }, merchantProvidedData, {
    nonce: payload.nonce,
    bin: payload.details.bin,
    // TODO in the future, we will allow merchants to pass in a custom onLookupComplete hook
    onLookupComplete: function (data, next) {
      next();
    }
  });

  verifyOptions.additionalInformation = verifyOptions.additionalInformation || {};
  verifyOptions.additionalInformation.acsWindowSize = verifyOptions.additionalInformation.acsWindowSize || DEFAULT_ACS_WINDOW_SIZE;

  return this._instance.verifyCard(verifyOptions);
};

ThreeDSecure.prototype.updateConfiguration = function (key, value) {
  this._config[key] = value;
};

ThreeDSecure.prototype.teardown = function () {
  return this._instance.teardown();
};

module.exports = ThreeDSecure;
