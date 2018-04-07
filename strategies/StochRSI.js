/*
  
  StochRSI - SamThomp 11/06/2014

  (updated by askmike) @ 30/07/2016

 */
// helpers
var _ = require('lodash');
var log = require('../core/log.js');

var config = require('../core/util.js').getConfig();
var settings = config.StochRSI;

var RSI = require('./indicators/RSI.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
	this.interval = settings.interval;
	this.delay = settings.delay;

  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.requiredHistory = config.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('rsi', 'RSI', { interval: this.interval });
  this.addIndicator('dema', 'DEMA', settings);

  this.RSIhistory = [];
  this.lastTransaction = 0;
  this.lastBuyPrice = 0;
}

// what happens on every new candle?
method.update = function(candle) {
	this.rsi = this.indicators.rsi.rsi;

	this.RSIhistory.push(this.rsi);

	this.lastTransaction++;

	if(_.size(this.RSIhistory) > this.interval)
		// remove oldest RSI value
		this.RSIhistory.shift();

	this.lowestRSI = _.min(this.RSIhistory);
	this.highestRSI = _.max(this.RSIhistory);
	this.stochRSI = ((this.rsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;
}

// for debugging purposes log the last 
// calculated parameters.
method.log = function() {
  var digits = 8;

  console.log('calculated StochRSI properties for candle:');
  console.log('\t', 'rsi:', this.rsi.toFixed(digits));
	console.log("StochRSI min:\t\t" + this.lowestRSI.toFixed(digits));
	console.log("StochRSI max:\t\t" + this.highestRSI.toFixed(digits));
	console.log("StochRSI Value:\t\t" + this.stochRSI.toFixed(2));
}

method.check = function(candle) {
	let price = candle.close;

	if(this.stochRSI > settings.thresholds.high) {
		// new trend detected
		if(this.trend.direction !== 'high')
			this.trend = {
				duration: 0,
				persisted: false,
				direction: 'high',
				adviced: false
			};

		this.trend.duration++;

		console.log('In high since', this.trend.duration, 'candle(s) - Persistance', settings.thresholds.persistence, ' last buy@', this.lastBuyPrice);

		if(this.trend.duration >= settings.thresholds.persistence)
			this.trend.persisted = true;

		if(this.trend.persisted /*&& !this.trend.adviced */&&  price >= this.lastBuyPrice*1.01 && this.lastBuyPrice != 0) {
			console.log('Selling@ ', price, ', Buy Price@ ', this.lastBuyPrice);
			this.trend.adviced = true;
			this.advice('short');
			this.lastBuyPrice = 0;
			this.lastTransaction = 0;
		}
		else
			this.advice();
		
	} else if(this.stochRSI < settings.thresholds.low) {

		// new trend detected
		if(this.trend.direction !== 'low')
			this.trend = {
				duration: 0,
				persisted: false,
				direction: 'low',
				adviced: false
			};

		this.trend.duration++;

		console.log('In low since', this.trend.duration, 'candle(s) - Persistance', settings.thresholds.persistence, ' last buy@', this.lastBuyPrice);
		console.log('stochRSI', this.stochRSI );

		if(this.trend.duration >= settings.thresholds.persistence)
			this.trend.persisted = true;



		console.log('transaction age', this.lastTransaction, ' delay ', this.delay);
		if(this.trend.persisted /*&& !this.trend.adviced */&& (this.lastBuyPrice === 0) && (this.lastTransaction >= this.delay)) {
			console.log('Buying@ ', price);
			this.trend.adviced = true;
			this.advice('long');
			this.lastBuyPrice = price;
		} 
		else
			this.advice();

	} else {
		// trends must be on consecutive candles
		this.trend.duration = 0;
		console.log('In no trend');

		this.advice();
	}

}

module.exports = method;