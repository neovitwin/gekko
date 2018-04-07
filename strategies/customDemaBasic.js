// helpers
var _ = require('lodash');
var log = require('../core/log.js');

// configuration
var config = require('../core/util.js').getConfig();
var settings = config.customDemaBasic;

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
  this.name = 'customDemaBasic';

  config.debug = true;

  this.trend = {
    direction: 'none',
    adviced: false
  };

  this.requiredHistory = config.tradingAdvisor.historySize;

  this.candleSize = config.tradingAdvisor.candleSize;

  this.candleStandarizer = this.candleSize/15;                //Standirized Candle calculations to be relative to the 15 min Candle Size

  // define the indicators we need
  this.addIndicator('dema', 'DEMA', settings);
  this.addIndicator('sma', 'SMA', settings.weight);

  this.history = {
    ATH: 0,
    ATL: 0,
    low: [],
    high: [],
    open: [],
    close: [],
    wvf: [],
    resDEMA: [],
    buyPrice: 0,
    trend: 5,
    length: 21,
    lastATH: 0,
    lastATL: 0
  }
  this.intersect ={
    x: 0,
    y: 0,
    seg1: 0,
    seg2: 0
  }

  this.lastTransactionAge = 0;
  this.tolerancePersistence = 0;
  
  this.dip =
  {
    active: false,        // Dip Analizer becomes active after 200 15 min candles and Potentially right after ATH
    warning: false,       // When warning is trigger we sell our position
    noBuyZone: false,     // No position is taken until we are out of the noBuyZone. 
    rATH: 0,              // relative ATH 
    rATL: 0,              // relative ATL
    ATH: 0,               // ATH (resets after exiting noBuyZone)
    ATL: 0,               // ATL (no reset condition) not used so far
    counter: 0            // active candles
  }
   
}

// what happens on every new candle?
method.update = function(candle) {

  let dema = this.indicators.dema;
  
  this.history.lastATH++;
  this.history.lastATL++;

  if(this.history.ATL === 0)
    this.history.ATL = candle.close;
  if(candle.close > this.history.ATH)
  {
    this.history.ATH = candle.close;
    this.history.lastATH = 0;
  }
  else if(candle.close < this.history.ATL)
  {
    this.history.ATL = candle.close;
    this.dip.ATL = candle.close;
    this.history.lastATL = 0;
  }

  if(candle.close > this.dip.ATH)
  {
    this.dip.ATH = candle.close;
    if((dema.inner.age*this.candleStandarizer) > 80)
      this.dip.active = true;
  } 

}

// for debugging purposes: log the last calculated
// EMAs and diff.
method.log = function() {
  let dema = this.indicators.dema;
  let sma = this.indicators.sma;
  
  console.log('Calculated DEMA and SMA properties for candle:');
  console.log('\t DEMA:', dema.result.toFixed(5));
  console.log('\t SMA:', sma.result.toFixed(5));
  console.log('\t DEMA age:', dema.inner.age, 'candles');
  console.log('\t ATH:', this.history.ATH, ' ATL:', this.history.ATL);
  console.log('\t Last Transaction occured:',this.lastTransactionAge, ' candles ago');
  if(this.dip.noBuyZone)
    console.log('\t noBuyZoneCount:',this.dip.counter, ', rATH', this.dip.rATH, ', rATL', this.dip.rATL);
}

method.check = function(candle) {
  let dema = this.indicators.dema;
  let sma = this.indicators.sma;
  let resDEMA = dema.result;
  let resEMA = dema.inner.result;
  let resSMA = sma.result;
  let price = candle.close;
  let diff = resSMA - resDEMA;
  var uptrend = 0;
  var downtrend = 0;

  let message = '@ ' + price.toFixed(8) + ' (' + resDEMA.toFixed(5) + '/' + diff.toFixed(5) + ')';
  if(diff > settings.thresholds.up) {
    console.log('we are currently in uptrend', message);
    //this.advice();

  } else if(diff < settings.thresholds.down) {
    console.log('we are currently in a downtrend', message);
    //this.advice();

  } else {
    console.log('we are currently not in an up or down trend', message);
    //this.advice();
  }

  // remove old data
  //if(l < settings.period) l= settings.period

  if(this.history.close.length > this.history.length) {
    this.history.close.shift(); this.history.open.shift();
    this.history.low.shift(); this.history.high.shift();
    this.history.wvf.shift();this.history.resDEMA.shift();
  }

  // add new data
  this.history.open.push(candle.open);
  this.history.close.push(candle.close);
  this.history.high.push(candle.high);
  this.history.low.push(candle.low);
  highest = Math.max.apply(null, this.history.close);
  this.history.wvf.push(((highest - candle.low) / highest) * 100);
  this.history.resDEMA.push(resDEMA);
  
  this.trend.direction = 'none';

  this.lastTransactionAge++;

  if(this.history.close.length -1 > this.history.trend)  //Make sure we have enought data stored
  {
    this.intersect = line_intersect(0, this.history.close[this.history.close.length-2], 1, this.history.close[this.history.close.length-1], 0, this.history.resDEMA[this.history.resDEMA.length-2], 1, this.history.resDEMA[this.history.resDEMA.length-1]); //Calculate Intersect between last 2 recored DEMA and Close Prices 
    // console.log('Line 1: ', this.history.close[this.history.close.length-2] , ' - ', this.history.close[this.history.close.length-1]);
    // console.log('Line 2: ', this.history.resDEMA[this.history.resDEMA.length-2] , ' - ', this.history.resDEMA[this.history.resDEMA.length-1]);
  }

  if(this.intersect)
  {  
    console.log('intersect: ', this.intersect.x , ' , ', this.intersect.y);
    if(this.intersect.x >= 1 && this.intersect.x < 2) // Lets assume Lines will intersect in the near future
    {
      if(settings.dataPoints.uptrend > this.history.trend || settings.dataPoints.uptrend < 1)
        uptrend = this.history.trend;
      else
        uptrend = settings.dataPoints.uptrend;

      if(settings.dataPoints.downtrend > this.history.trend || settings.dataPoints.downtrend < 1)
        downtrend = this.history.trend;
      else
        downtrend = settings.dataPoints.downtrend;

      for (var i = uptrend - 1; i > 1; i--) {
        //console.log('history Close: ', this.history.close[i], ' resDEMA: ',this.history.resDEMA[i], ' i: ', i);
        if(this.history.close[i] <= this.history.resDEMA[0] )
        {
          this.trend.direction = 'up';
        }
        else
        {
          this.trend.direction = 'none';
          i = 0;
        }
      }
      // console.log('history Close: ', this.history.close[0], ' resDEMA: ',this.history.resDEMA[0], ' i: ', Math.abs(this.history.resDEMA[0] - this.history.close[0])/this.history.close[0]);
      // if(this.trend.direction === 'up' && (Math.abs(this.history.resDEMA[0] - this.history.close[0])/this.history.close[0]) < 0.01) 
      //   this.trend.direction = 'up';
      // else
      //   this.trend.direction = 'none';

      if(this.trend.direction === 'none')
      {
        for (var i = downtrend - 1; i > 1; i--) {
          if(this.history.close[i] >= this.history.resDEMA[0])
          {
            this.trend.direction = 'down';
          }
          else
          {
            this.trend.direction = 'none';
            i = 0;
          }
        }
        // if(this.trend.direction === 'down' && (Math.abs(this.history.resDEMA[0] - this.history.close[0])/this.history.close[0]) < 0.01) 
        //   this.trend.direction = 'down';
        // else
        //   this.trend.direction = 'none';
      }

      // if(this.trend.direction === 'none' && this.lastTransactionAge < 2 && this.history.buyPrice > 0)
      //     this.trend.direction = 'down';

      console.log('trend: ', this.trend.direction);
    }
  }
  

  // if(this.dip.active)
  // {
  //   console.log('Dip?', this.dip.ATH, ' , ',this.history.close[this.history.close.length-2], " , ", this.dip.noBuyZone );
  //   if(price < this.dip.ATH && this.history.close[this.history.close.length-2] === this.dip.ATH && !this.dip.noBuyZone && this.trend.direction === 'down')
  //   {
  //       console.log('SELL Dip', message);
  //       this.advice('short');
  //       this.history.buyPrice = 0;
  //       this.lastTransactionAge = 0;
  //       this.dip.noBuyZone = true;
  //   }

  //   if(this.dip.noBuyZone)
  //   {
  //     if(this.dip.rATL === 0)
  //       this.dip.rATL = price;
  //     if(price < this.dip.rATL)
  //     {
  //       this.dip.rATL = price;
  //     }
  //     this.dip.counter++;

  //     this.dip.rATH = this.history.close[0];

  //     if((this.dip.rATH === price && this.dip.rATL < price) || price >= this.dip.ATH )
  //     {
  //       this.dip.noBuyZone = false; //Exit no buy zone
  //       this.dip.ATH = 0 // Reset ATH as we exit it;
  //       this.counter = 0 // Reset counter for tacking purposes 
  //       this.dip.rATL = 0 // Reset rATL for next dip
  //     }

  //   }

  // }

  if(!this.dip.noBuyZone)
  {
    if(this.trend.direction === 'up' && this.history.buyPrice === 0)
    {
      console.log('BUY', message);
      this.advice('long');
      this.history.buyPrice = price;
      this.lastTransactionAge = 0;
    }
    else if(price > this.history.ATL && this.history.close[this.history.close.length-1] === this.history.ATL && dema.inner.age > 300) //Price right after ATL
    {
      console.log('BUY ATL', message);
      this.advice('long');
      this.history.buyPrice = price;
      this.lastTransactionAge = 0;
    }
  }




  if(this.trend.direction === 'down' && price > (this.history.buyPrice*1.01))
  {
    console.log('SELL', message);
    this.advice('short');
    this.history.buyPrice = 0;
    this.lastTransactionAge = 0;
  }
  else if(price > (this.history.buyPrice*1.01) && price <= this.history.ATH && this.history.close[this.history.close.length-1] === this.history.ATH) //Price right after ATH
  {
    console.log('SELL ATH', message);
    this.advice('short');
    this.history.buyPrice = 0;
    this.lastTransactionAge = 0;
  }
  
  else if(price > (this.history.buyPrice*settings.tolerance.percentage) && (this.lastTransactionAge*this.candleStandarizer) > settings.tolerance.age && this.tolerancePersistence < settings.tolerance.persistence /*&& this.trend.direction === 'down'*/ )
  {
    console.log('SELL FUD', message);
    this.advice('short');
    this.history.buyPrice = 0;
    this.lastTransactionAge = 0;
    this.tolerancePersistence++;
  }
  // else if(price < (this.history.buyPrice*2) && price > (this.history.buyPrice*0.99) && (this.lastTransactionAge*this.candleStandarizer) > settings.tolerance.age*5)
  // {
  //   console.log('SELL FUD 2', message);
  //   this.advice('short');
  //   this.history.buyPrice = 0;
  //   this.lastTransactionAge = 0;
  //   this.tolerancePersistence++;
  // }
  // else if (diff < settings.thresholds.down && this.intersect )
  // {
  //   if(price > (this.history.buyPrice*1.01) && Math.abs(this.intersect.x) < 0.3 && (this.history.close[this.history.close.length-1] < this.history.resDEMA[this.history.resDEMA.length-1]))
  //   {      
  //     console.log('SELL TEST', message);
  //     this.advice('short');
  //     this.history.buyPrice = 0;
  //     this.lastTransactionAge = 0;
  //     this.tolerancePersistence++;
  //   }
  // }
  else
    this.advice();

}

// http://paulbourke.net/geometry/pointlineplane/
function line_intersect(x1, y1, x2, y2, x3, y3, x4, y4)
{
    var ua, ub, denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
    if (denom == 0) {
        return null;
    }
    ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3))/denom;
    ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3))/denom;
    return {
        x: x1 + ua*(x2 - x1),
        y: y1 + ua*(y2 - y1),
        seg1: ua >= 0 && ua <= 1,
        seg2: ub >= 0 && ub <= 1
    };
}

module.exports = method;
