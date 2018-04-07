/*
	RSI Bull and Bear
	Use different RSI-strategies depending on a longer trend
	3 feb 2017
	
	(CC-BY-SA 4.0) Tommie Hansen
	https://creativecommons.org/licenses/by-sa/4.0/
	
*/

// req's
var log = require ('../core/log.js');
var config = require ('../core/util.js').getConfig();
var settings = config.RSI_BULL_BEAR;


// strategy
var strat = {
	
	/* INIT */
	init: function()
	{
		this.name = 'RSI_BULL_BEAR';
		this.requiredHistory = config.tradingAdvisor.historySize;
		this.resetTrend();		
		
		// debug? set to flase to disable all logging/messages (improves performance)
		this.debug = true;
		
		// performance
		config.backtest.batchSize = 1000; // increase performance
		config.silent = true;
		config.debug = true;
		
		// add indicators
		this.addIndicator('maSlow', 'SMA', settings.SMA_long );
		this.addIndicator('maFast', 'SMA', settings.SMA_short );
		this.addIndicator('BULL_RSI', 'RSI', { interval: settings.BULL_RSI });
		this.addIndicator('BEAR_RSI', 'RSI', { interval: settings.BEAR_RSI });
		
		// debug stuff
		this.startTime = new Date();
		this.stat = {
			bear: { min: 100, max: 0 },
			bull: { min: 100, max: 0 }
		};

		this.lastBuyPrice  = 0;
		this.lastTransaction = 0;
		this.delay = settings.delay;
		this.price = 0;
		this.profit = 0;
		this.startPrice = 100;
		
	}, // init()
	
	
	/* RESET TREND */
	resetTrend: function()
	{
		var trend = {
			duration: 0,
			direction: 'none',
			longPos: false,
		};
	
		this.trend = trend;
	},
	
	/* get lowest/highest for backtest-period */
	lowHigh: function( rsi, type )
	{
		let cur;
		if( type == 'bear' ) {
			cur = this.stat.bear;
			if( rsi < cur.min ) this.stat.bear.min = rsi; // set new
			if( rsi > cur.max ) this.stat.bear.max = rsi;
		}
		else {
			cur = this.stat.bull;
			if( rsi < cur.min ) this.stat.bull.min = rsi; // set new
			if( rsi > cur.max ) this.stat.bull.max = rsi;
		}
	},
	
	
	/* CHECK */
	check: function(candle)
	{
		price = candle.close;
		this.lastTransaction++;
		// get all indicators
		let ind = this.indicators,
			maSlow = ind.maSlow.result,
			maFast = ind.maFast.result,
			rsi;
			
		// BEAR TREND
		if( maFast < maSlow )
		{
			rsi = ind.BEAR_RSI.result;
			if( rsi > settings.BEAR_RSI_high ) this.short(price);
			else if( rsi < settings.BEAR_RSI_low ) this.long(price);
			
			if(this.debug) this.lowHigh( rsi, 'bear' );
			// console.log('BEAR-trend');
		}

		// BULL TREND
		else
		{
			rsi = ind.BULL_RSI.result;
			if( rsi > settings.BULL_RSI_high ) this.short(price);
			else if( rsi < settings.BULL_RSI_low )  this.long(price);
			if(this.debug) this.lowHigh( rsi, 'bull' );
			// console.log('BULL-trend');
		}
	
	}, // check()
	
	
	/* LONG */
	long: function(price)
	{
		if( this.trend.direction !== 'up' && this.lastTransaction >= this.delay && this.lastBuyPrice == 0) // new trend? (only act on new trends)
		{
			this.resetTrend();
			this.trend.direction = 'up';
			this.advice('long');
			// console.log('go long@ ', price);
      		this.lastBuyPrice = price;
		}
		
		if(this.debug)
		{
			this.trend.duration++;
			// console.log ('Long since', this.trend.duration, 'candle(s)');
		}
	},
	
	
	/* SHORT */
	short: function(price)
	{
		// new trend? (else do things)
		if( this.trend.direction !== 'down' && price > this.lastBuyPrice*1.01 && this.lastBuyPrice != 0)
		{
			this.resetTrend();
			this.trend.direction = 'down';
			this.advice('short');
			this.startPrice *= price/this.lastBuyPrice;
			//this.profit += price - this.lastBuyPrice  - 0.0015*(price+this.lastBuyPrice) ;
			console.log('profit' , (price/this.lastBuyPrice - 1) * 100, '% profit = ', this.startPrice);
			this.lastBuyPrice = 0;
     		this.lastTransaction = 0;
		}
		
		if(this.debug)
		{
			this.trend.duration++;
			// console.log ('Short since', this.trend.duration, 'candle(s)');
		}
	},
	
	
	/* END backtest */
	end: function(){
		
		let seconds = ((new Date()- this.startTime)/1000),
			minutes = seconds/60,
			str;
			
		minutes < 1 ? str = seconds + ' seconds' : str = minutes + ' minutes';
		
		// console.log('====================================');
		// console.log('Finished in ' + str);
		// console.log('====================================');
		
		if(this.debug)
		{
			let stat = this.stat;
			// console.log('RSI low/high for period');
			// console.log('BEAR low/high: ' + stat.bear.min + ' / ' + stat.bear.max);
			// console.log('BULL low/high: ' + stat.bull.min + ' / ' + stat.bull.max);
		}

	}
	
};

module.exports = strat;