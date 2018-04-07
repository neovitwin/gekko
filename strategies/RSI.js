/*
  
  RSI - cykedev 14/02/2014

  (updated a couple of times since, check git history)

 */
// helpers
var _ = require('lodash');
var log = require('../core/log.js');

var config = require('../core/util.js').getConfig();
var settings = config.RSI;

var RSI = require('./indicators/RSI.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
  this.name = 'RSI';

  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.requiredHistory = config.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('rsi', 'RSI', settings);

  this.lastTransaction = 0;
  this.delay = settings.delay;
  this.lastBuyPrice = 0;
  this.startPrice = 100;
}

// for debugging purposes log the last 
// calculated parameters.
method.log = function(candle) {
  var digits = 8;
  var rsi = this.indicators.rsi;

  log.debug('calculated RSI properties for candle:');
  log.debug('\t', 'rsi:', rsi.rsi.toFixed(digits));
  log.debug('\t', 'price:', candle.close.toFixed(digits));
}

method.check = function(candle) {
  let price = candle.close;
  var rsi = this.indicators.rsi;
  var rsiVal = rsi.result;

  this.lastTransaction++;

  if(rsiVal > settings.thresholds.high) {

    // new trend detected
    if(this.trend.direction !== 'high')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'high',
        adviced: false
      };

    this.trend.duration++;

    // console.log('In high since', this.trend.duration, 'candle(s) - Persistance', settings.thresholds.persistence, ' last buy@', this.lastBuyPrice);

    if(this.trend.duration >= settings.thresholds.persistence)
      this.trend.persisted = true;

    if(this.trend.persisted /*&& !this.trend.adviced */&&  price >= this.lastBuyPrice*1.01 && this.lastBuyPrice != 0) {
      // console.log('Selling@ ', price, ', Buy Price@ ', this.lastBuyPrice);
      this.trend.adviced = true;
      this.advice('short');
      this.startPrice *= price/this.lastBuyPrice;
      //this.profit += price - this.lastBuyPrice  - 0.0015*(price+this.lastBuyPrice) ;
      console.log('profit' , (price/this.lastBuyPrice - 1) * 100, '% profit = ', this.startPrice);
      this.lastBuyPrice = 0;
      this.lastTransaction = 0;
    }
    else
      this.advice();
    
  } else if(rsiVal < settings.thresholds.low) {

    // new trend detected
    if(this.trend.direction !== 'low')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'low',
        adviced: false
      };

    this.trend.duration++;

    // console.log('In low since', this.trend.duration, 'candle(s) - Persistance', settings.thresholds.persistence, ' last buy@', this.lastBuyPrice);
    // console.log('rsiVal', rsiVal );

    if(this.trend.duration >= settings.thresholds.persistence)
      this.trend.persisted = true;



    // console.log('transaction age', this.lastTransaction, ' delay ', this.delay);
    if(this.trend.persisted /*&& !this.trend.adviced */&& (this.lastBuyPrice === 0) && (this.lastTransaction >= this.delay)) {
      // console.log('Buying@ ', price);
      this.trend.adviced = true;
      this.advice('long');
      this.lastBuyPrice = price;
    } 
    else
      this.advice();

  } else {

    log.debug('In no trend');

    this.advice();
  }
}

module.exports = method;
