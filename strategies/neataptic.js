const config = require('../core/util.js').getConfig();
const log = require('../core/log.js');
const _ = require('lodash');
var settings = config.neataptic;

const strat = {
  init() {
    this.name = 'neataptic';
    this.requiredHistory = config.tradingAdvisor.historySize;

    config.backtest.batchSize = 1000;
    config.silent = true;
    config.debug = false;

    this.addIndicator('neat', 'neataptic', {
      hiddenLayers: settings.hiddenLayers,
      lookAhead: settings.lookAheadCandles,
      iterations: settings.iterations,
      error: settings.error,
      rate: settings.learnRate,
      momentum: settings.momentum,
      history: config.tradingAdvisor.historySize,
      rsi: settings.RSI,
      sma: settings.SMA,
      architecture: settings.architecture
    });

    this.position = 'none';
    this.longAt = 0;
    this.stopLossTimes = 0;

    this.startTime = new Date();
  },

  check(candle) {
    if (this.candle.close.length < this.requiredHistory) {
      return;
    }

    let short = false;
    let long = true;
    let minPercentMet = false;

    for (let i = 0, iLen = this.indicators.neat.prediction.length; i < iLen; i++) {
      if (settings.candlesForShort.indexOf(i + 1) !== -1) {
        short = short || this.checkShort(candle, this.indicators.neat.prediction[i]);
      }

      if (settings.candlesForLong.indexOf(i + 1) !== -1) {
        let percentage = i + 1 === _.max(settings.candlesForLong) ? settings.minPercentIncrease : 0;
        long = long && this.checkLong(candle, this.indicators.neat.prediction[i], percentage);
      }
    }

    if (short && this.position !== 'short' || this.position === 'long' && this.checkStopLoss(candle)) {
      this.position = 'short';
      this.advice('short');
    } else if (long && this.position !== 'long') {
      this.position = 'long';
      this.longAt = candle.close;
      this.advice('long');
    }
  },

  checkShort(candle, prediction) {
    return candle.close > prediction;
  },

  checkLong(candle, prediction, percentThresh) {
    return prediction > candle.close && this.convertToPercent(candle.close, prediction) > percentThresh;
  },

  checkStopLoss(candle) {
    let ret = false;

    if (this.longAt > candle.close) {
      ret = this.convertToPercent(candle.close, this.longAt) > settings.stopLoss;
      if (ret) {
        this.stopLossTimes++;
      }
    }

    return ret;
  },

  convertToPercent(numerator, denominator) {
    return (1 - (numerator / denominator)) * 100;
  },

  end() {
    let seconds = ((new Date() - this.startTime) / 1000),
      minutes = seconds / 60,
      str;

    minutes < 1 ? str = seconds.toFixed(2) + ' seconds' : str = minutes.toFixed(2) + ' minutes';

    log.info('====================================');
    log.info('Finished in ' + str + ' stopped loss ' + this.stopLossTimes + ' times');
    log.info('====================================');
  }
}

module.exports = strat;