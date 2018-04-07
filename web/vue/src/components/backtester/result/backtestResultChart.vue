<template lang='jade'>
div
  div#resultHighchart
</template>

<script>

import _ from 'lodash'
import Vue from 'vue'
import * as Highcharts from 'highcharts/highstock'

// import { post } from '../../../tools/ajax'
// import spinner from '../../global/blockSpinner.vue'
// import dataset from '../../global/mixins/dataset'
const colors = ['#7cb5ec', '#f7a35c', '#90ee7e', '#7798BF', '#aaeeee', '#ff0066', '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'];
const YAXIS_PRIMARY = 'primary'
const YAXIS_SECONDARY = 'secondary'

const indicatorResultMapFunctions = {
  'talib-dema': (res) => [moment(res.date).unix() * 1000, res.result.outReal],
  default: (res) => [moment(res.date).unix() * 1000, res.result]
}

function getIndicatorResultMapFunction(indicatorType) {
  if (indicatorResultMapFunctions.hasOwnProperty(indicatorType)) {
    return indicatorResultMapFunctions[indicatorType];
  } else {
    return indicatorResultMapFunctions.default;
  }
}

// Types of indicators which should be drawn on the secondary yAxis
const secondaryAxisIndicatorTypes = ['CCI', 'StochRSI', 'RSI', 'MACD'];

const strategyResultMapFunctions = {
  DDEMA: (res) => [moment(res.date).unix() * 1000, res.result]
}

export default {
  props: ['result'],
  components: {
    // spinner
  },
  data: () => {
    return {
      chart: null,
    };
  },
  // mixins: [ dataset ],
  methods: {
    // humanizeDuration: (n) => {
    //   return window.humanizeDuration(n, {largest: 4});
    // },
    humanizeTimestamp: timestamp => moment.utc(timestamp).format('YYYY-MM-DD HH:mm')
  },
  mounted () {
    console.log('backtest result chart mounted', this.result)
    const chartOptions = {
      chart: {
        renderTo: 'resultHighchart',
        zoomType: 'x',
        height: 720,
        ignoreHiddenSeries: true
      },
      rangeSelector: {
        selected: 1
      },
      title: {
        // text: `${this.dataset.asset}-${this.dataset.currency} Trades`
      },
      legend: {
          enabled: true,
          align: 'center',
          backgroundColor: '#FFFFFF',
          borderColor: 'black',
          borderWidth: 0,
          layout: 'horizontal',
          verticalAlign: 'bottom',
          y: 0,
          shadow: false,
          floating: false
      },

      rangeSelector: {
          allButtonsEnabled: true,
          buttons: [{
              type: 'day',
              count: 1,
              text: '1d'
          }, {
              type: 'week',
              count: 1,
              text: '7d'
          }, {
              type: 'month',
              count: 1,
              text: '1m'
          }, {
              type: 'month',
              count: 3,
              text: '3m'
          }, {
              type: 'year',
              count: 1,
              text: '1y'
          }, {
              type: 'ytd',
              count: 1,
              text: 'YTD'
          }, {
              type: 'all',
              text: 'ALL'
          }],
          selected: 6,
          inputEnabled: true,
          enabled: true
      },

      yAxis: [{ // Primary yAxis
        opposite: false,
        height: '80%',
        id: YAXIS_PRIMARY,
        title: {
          text: `${this.result.report.asset}-${this.result.report.currency} Trades`,
          style: {
            color: colors[0]
          }
        }
      }, {
        id: YAXIS_SECONDARY,
        gridLineWidth: 0,
        opposite: false,
        top: '80%',
        height: '20%',
        offset: 2,
        title: {
          text: 'secondary',
          // style: {
          //   color: color
          // }
        }
      }],

      series: [{
        name: `${this.result.report.asset}-${this.result.report.currency}`,
        id: 'trades',
        data: this.result.candles.map((candle) => [moment(candle.start).unix() * 1000, candle.close]),
        color: colors[0],
        lineWidth: 3,
        tooltip: {
          valueDecimals: 2
        }
      }],

      plotOptions: {
        series: {
          animation: false,
          states: {
            hover: {
              // lineWidth: 1,
              // lineWidthPlus: 1
            }
          }
        //   marker: {
        //     enabled: true
        //   }
        }
      }
    }

    // Add indicator results to chart
    for (let name in this.result.indicatorResults) {
      const indicator = this.result.indicatorResults[name]
      const indicatorType = indicator.talib ? `talib-${indicator.type}` : indicator.type;

      console.log(`add indicator result for type ${indicatorType}, name ${name}`)
      const resultMapFunction = getIndicatorResultMapFunction(indicatorType);
      const resultYAxis = secondaryAxisIndicatorTypes.indexOf(indicatorType) > -1 ? YAXIS_SECONDARY : YAXIS_PRIMARY;
      // indicatorResultYAxis[indicatorType] || indicatorResultYAxis.default

      let displayName = name + (indicator.talib ? ` (talib ${indicator.type})` : ` (${indicator.type})`)

      const color = colors[chartOptions.series.length];
      // const yAxisId = `y${chartOptions.yAxis.length}`;
      const seriesId = `s${chartOptions.series.length}`;

      // Add yAxis
      // chartOptions.yAxis.push({
      //   id: yAxisId,
      //   gridLineWidth: 0,
      //   opposite: true,
      //   height: '80%',
      //   title: {
      //     text: displayName,
      //     style: {
      //       color: color
      //     }
      //   }
      // })

      // Add Indicator Series
      chartOptions.series.push({
        name: displayName,
        id: seriesId,
        data: indicator.data.map(resultMapFunction),
        yAxis: resultYAxis,
        lineWidth: 1,
        color: color,
        tooltip: {
          valueDecimals: 3
        }
      })
    }

    // Add strategy results to chart
    let stratResultSeriesId;

    for (let name in this.result.strategyResults) {
      const displayName = `${name} strategy result`;
      const color = colors[chartOptions.yAxis.length];
      const yAxisId = `y${chartOptions.yAxis.length}`;
      const seriesId = `s${chartOptions.yAxis.length}`;
      stratResultSeriesId = seriesId;

      // chartOptions.yAxis.push({
      //   id: yAxisId,
      //   gridLineWidth: 0,
      //   opposite: false,
      //   top: '80%',
      //   height: '20%',
      //   offset: 2,
      //   title: {
      //     text: displayName,
      //     style: {
      //       color: color
      //     }
      //   }
      // })

      chartOptions.series.push({
        name: displayName,
        id: seriesId,
        data: this.result.strategyResults[name].data.map(strategyResultMapFunctions[name]),
        yAxis: resultYAxis,
        lineWidth: 1,
        color: color,
        tooltip: {
          valueDecimals: 3
        }
      })
    }

    // Add Buy/Sell Flags
    const buySellFlags = this.result.trades.map((trade) => {
      const isBuy = trade.action === 'buy';
      let text = isBuy ? `Buy for ${trade.price}` : `Sell for ${trade.price}`
      return {
        x: moment(trade.date).unix() * 1000,
        title: isBuy ? 'B' : 'S',
        text,
        color: isBuy? 'green' : "red",
        shape: isBuy? 'squarepin' :'circlepin',
        marker:{ fillColor: isBuy? 'gree' : 'red'}
      }
    })
    const flagSeriesId = `f${chartOptions.yAxis.length}`;
    chartOptions.series.push({
      type: 'flags',
      name: 'Flags',
      id: flagSeriesId,
      data: buySellFlags,      
      onSeries: 'trades',
      // onSeries: stratResultSeriesId,
      // color: stratInstance.highcharts.color,
      // fillColor: stratInstance.highcharts.color
    })

    this.chart = Highcharts.stockChart(chartOptions)

  },
  watch: {
    // setIndex: function() {
    //   this.set = this.datasets[this.setIndex];

    //   this.updateCustomRange();

    //   this.emitSet(this.set);
    // },

    // customTo: function() { this.emitSet(this.set); },
    // customFrom: function() { this.emitSet(this.set); },
    // importCandleSize: function() { this.emitSet(this.set); },
    // importCandleSizeUnit: function() { this.emitSet(this.set); }
  }
}
</script>
<style>
td.radio {
  width: 45px;
}
td label{
  display: inline;
  font-size: 1em;
}
</style>
