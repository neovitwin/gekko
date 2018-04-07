<template lang='jade'>
div
  p {{ candles.length }} data points
  div#highchart
  center
    div
      button(v-on:click='useHighchartTimerange') Use selected timerange
      button(v-on:click='resetHighchartTimerange') Reset
    span(v-if='customTimerange.fromTimestampMs') {{ humanizeTimestamp(customTimerange.fromTimestampMs) }} →&nbsp;
    span(v-if='customTimerange.toTimestampMs') {{ humanizeTimestamp(customTimerange.toTimestampMs) }}
</template>

<script>

import _ from 'lodash'
import Vue from 'vue'
import * as Highcharts from 'highcharts/highstock'

console.log(Highcharts.getOptions().colors)
// import { post } from '../../../tools/ajax'
// import spinner from '../../global/blockSpinner.vue'
// import dataset from '../../global/mixins/dataset'

export default {
  props: ['candles', 'dataset'],
  components: {
    // spinner
  },
  data: () => {
    return {
      chart: null,
      customTimerange: {
        fromTimestampMs: null,
        toTimestampMs: null
      }
      // setIndex: -1,
      // customTo: false,
      // customFrom: false,
      // rangeVisible: false,
      // importCandleSize: 1,
      // importCandleSizeUnit: 'minutes',
      // set: false
    };
  },
  // mixins: [ dataset ],
  methods: {
    // humanizeDuration: (n) => {
    //   return window.humanizeDuration(n, {largest: 4});
    // },
    humanizeTimestamp: timestamp => moment.utc(timestamp).format('YYYY-MM-DD HH:mm'),
    useHighchartTimerange: function() {
      const fromTimestampMs = parseInt(this.chart.xAxis[0].min, 10)
      const toTimestampMs = parseInt(this.chart.xAxis[0].max, 10)
      this.customTimerange = { fromTimestampMs, toTimestampMs }
      this.$emit('useCustomTimerange', { fromTimestampMs, toTimestampMs })
    },
    resetHighchartTimerange: function() {
      this.customTimerange = {
        fromTimestampMs: null,
        toTimestampMs: null
      }
      this.$emit('resetCustomTimerange')
    }
  },
  mounted () {
    console.log('charts mounted')
    this.chart = Highcharts.stockChart({
      chart: {
        renderTo: 'highchart',
        zoomType: 'x'
      },
      rangeSelector: {
        selected: 1
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
      title: {
        // text: `${this.dataset.asset}-${this.dataset.currency} Trades`
      },
      yAxis: [{ // Primary yAxis
        opposite: false,
        title: {
          text: `${this.dataset.asset}-${this.dataset.currency} Trades`,
          style: {
            color: Highcharts.getOptions().colors[0]
          }
        }
      }],
      series: [{
        name: `${this.dataset.asset}-${this.dataset.currency}`,
        id: 'trades',
        data: this.candles.map((candle) => [candle.timestampMs, candle.open]),
        color: Highcharts.getOptions().colors[0],
        tooltip: {
          valueDecimals: 2
        }
      }]
    })

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
