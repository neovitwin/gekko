// helpers
var _ = require('lodash');
var log = require('../core/log.js');

var config = require('../core/util.js').getConfig();
var settings = config.TSI;

var TSI = require('./indicators/TSI.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
  this.name = 'TSI';

  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.requiredHistory = config.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('tsi', 'TSI', settings);
  // this.addIndicator('dema', 'DEMA', settings);

  this.lastBuyPrice  = 0;
  this.startPrice = 100;
}

// for debugging purposes log the last 
// calculated parameters.
method.log = function(candle) {
  var digits = 8;
  var tsi = this.indicators.tsi;


  // console.log('calculated Ultimate Oscillator properties for candle:');
  // console.log('\t', 'tsi:', tsi.tsi.toFixed(digits));
  // console.log('\t', 'price:', candle.close.toFixed(digits));
}

method.check = function(candle) {
  var tsi = this.indicators.tsi;
  var tsiVal = tsi.tsi;
  price = candle.close;


  if(tsiVal > settings.thresholds.high) {

    // new trend detected
    if(this.trend.direction !== 'high')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'high',
        adviced: false
      };

    this.trend.duration++;

    // console.log('In high since', this.trend.duration, 'candle(s)');

    if(this.trend.duration >= settings.thresholds.persistenceSell)
      this.trend.persisted = true;

    if(this.trend.persisted && !this.trend.adviced && price > this.lastBuyPrice*1.02 && this.lastBuyPrice != 0) {
      this.trend.adviced = true;
      this.advice('short');
      this.startPrice *= price/this.lastBuyPrice;
      //this.profit += price - this.lastBuyPrice  - 0.0015*(price+this.lastBuyPrice) ;
      console.log('profit' , (price/this.lastBuyPrice - 1) * 100, '% profit = ', this.startPrice);
      this.lastBuyPrice = 0;
      // console.log('SELL@', price);
    } else
      this.advice();
    
  } else if(tsiVal < settings.thresholds.low) {

    // new trend detected
    if(this.trend.direction !== 'low')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'low',
        adviced: false
      };

    this.trend.duration++;

    // console.log('In low since', this.trend.duration, 'candle(s)');

    if(this.trend.duration >= settings.thresholds.persistenceBuy)
      this.trend.persisted = true;

    if(this.trend.persisted && !this.trend.adviced && this.lastBuyPrice == 0) {
      this.trend.adviced = true;
      this.advice('long');
      this.lastBuyPrice = price;
      // console.log('BUY@', price);
    } else
      this.advice();

  } else {

    // console.log('In no trend');

    this.advice();
  }
}

module.exports = method;
