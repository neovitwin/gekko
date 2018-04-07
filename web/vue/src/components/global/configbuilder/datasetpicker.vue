<template lang='jade'>
div
  h3 Select a dataset
  .txt--center.my2(v-if='datasetScanstate === "idle"')
    a.w100--s.btn--blue.scan-btn(href='#', v-on:click.prevent='scan') scan available data
  .txt--center.my2(v-if='datasetScanstate === "scanning"')
    spinner
  .my2(v-if='datasetScanstate === "scanned"')
    table.full
      thead
        tr
          th
          th exchange
          th currency
          th asset
          th from
          th to
          th duration
      tbody
        tr(v-for='(set, i) in datasets')
          td.radio
            input(type='radio', name='dataset', :value='i', v-model='setIndex', v-bind:id='set.id')
          td
            label(v-bind:for='set.id') {{ set.exchange }}
          td
            label(v-bind:for='set.id') {{ set.currency }}
          td
            label(v-bind:for='set.id') {{ set.asset }}
          td
            label(v-bind:for='set.id') {{ fmt(set.from) }}
          td
            label(v-bind:for='set.id') {{ fmt(set.to) }}
          td
            label(v-bind:for='set.id') {{ humanizeDuration(set.to.diff(set.from)) }}
    em
      // a(href='#', v-on:click.prevent='openRange', v-if='!rangeVisible') Adjust range
    template(v-if='rangeVisible')
      div
        label(for='customFrom') From:
        input(v-model='customFrom', type='datetime-local')
      div
        label(for='customTo') To:
        input(v-model='customTo', type='datetime-local')
      div
        label(for='candleSize') Candle Size:
        .grd-row
          .grd-row-col-3-6
            input(v-model='importCandleSize')
          .grd-row-col-3-6.align
            .custom-select.button
              select(v-model='importCandleSizeUnit')
                option minutes
                option hours
                option days
      div
        a.w100--s.my1.btn--blue(href='#', v-on:click='showData') Show Data

    a(name='highchart')
    div.contain.my1(v-if='candleFetch')
      div(v-if='candleFetch === "fetching"')
        div Fetching data...
      chart(v-if='candleFetch === "fetched"', :candles='candles', :dataset='set', v-on:useCustomTimerange='useCustomTimerange', v-on:resetCustomTimerange='resetCustomTimerange')

</template>

<script>

import _ from 'lodash'
import Vue from 'vue'

import { post } from '../../../tools/ajax'
import spinner from '../../global/blockSpinner.vue'
import dataset from '../../global/mixins/dataset'
import chart from '../../global/configbuilder/chart.vue'

export default {
  components: {
    spinner,
    chart
  },
  data: () => {
    return {
      setIndex: -1,
      customTo: false,
      customFrom: false,
      rangeVisible: false,
      importCandleSize: 1,
      importCandleSizeUnit: 'hours',
      set: false,

      // timerange set by selection in chart
      customTimerange: {},

      // data preview
      candleFetch: null,
      candles: []
    };
  },
  mixins: [ dataset ],
  methods: {
    humanizeDuration: (n) => {
      return window.humanizeDuration(n, {largest: 4});
    },
    fmt: mom => mom.utc().format('YYYY-MM-DDTHH:mm'),
    candleSize: function() {
      const candleSizeValue = parseInt(this.importCandleSize, 10)
      if(this.importCandleSizeUnit === 'minutes')
        return candleSizeValue;
      else if(this.importCandleSizeUnit === 'hours')
        return candleSizeValue * 60;
      else if(this.importCandleSizeUnit === 'days')
        return candleSizeValue * 60 * 24;
    },
    openRange: function() {
      if(this.setIndex === -1)
        return alert('select a dataset first');

      this.updateCustomRange();

      this.rangeVisible = true;
    },
    updateCustomRange: function() {
      this.customTo = this.fmt(this.set.to);
      this.customFrom = this.fmt(this.set.from);
    },

    emitSet: function(val) {
      if(!val)
        return;

      let set = Vue.util.extend({}, val);

      // The intitial import timerange
      if (this.customTo) {
        set.to = moment.utc(this.customTo, 'YYYY-MM-DDTHH:mm').format();
      }
      if (this.customFrom) {
        set.from = moment.utc(this.customFrom, 'YYYY-MM-DDTHH:mm').format();
      }

      // Overwrite timerange with selection from chart
      if (this.customTimerange.toTimestampMs) {
        set.to = moment.utc(this.customTimerange.toTimestampMs).format();
      }
      if (this.customTimerange.fromTimestampMs) {
        set.from = moment.utc(this.customTimerange.fromTimestampMs).format();
      }

      set.candleSize = this.candleSize();
      this.$emit('dataset', set);
    },

    useCustomTimerange: function(timerange) {
      console.log('useCustomTimerange', timerange);
      this.customTimerange = timerange
      this.emitSet(this.set);
    },

    resetCustomTimerange: function() {
      console.log('resetCustomTimerange')
      this.customTimerange = {}
      this.emitSet(this.set);
    },

    // Showdata downloads the current candles and updates the chart
    showData: function() {
      this.candleFetch = 'fetching';

      let from = this.customFrom;
      let to = this.customTo;
      let candleSize = this.candleSize();

      let config = {
          watch: {
            exchange: this.set.exchange,
            currency: this.set.currency,
            asset: this.set.asset
          },
          daterange: {
            to, from
          },
          candleSize
        };

      console.log('getCandles config:', config)
      post('getCandles', config, (err, res) => {
        this.candleFetch = 'fetched';
        // // todo
        if(!res || res.error || !_.isArray(res)) {
          console.log('getCandles api error:', res);
          return;
        }

        console.log('candles received:', res)
        this.candles = res.map(c => {
          c.timestampMs = c.start * 1000
          c.start = moment.unix(c.start).utc().format();
          return c;
        });
      })
    }
  },
  watch: {

    setIndex: function() {
      this.set = this.datasets[this.setIndex];

      this.updateCustomRange();
      this.openRange();
      this.emitSet(this.set);
    },

    customTo: function() { this.emitSet(this.set); },
    customFrom: function() { this.emitSet(this.set); },
    importCandleSize: function() { this.emitSet(this.set); },
    importCandleSizeUnit: function() { this.emitSet(this.set); }
  },
  mounted () {
    this.scan()
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
