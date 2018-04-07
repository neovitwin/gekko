<template lang='jade'>
  div
    .hr.contain
    div.contain
      h3 Backtest result
    result-summary(:report='result.report')
    .hr.contain
    backtestResultChart(:result='result')
    .hr.contain
    chart(:data='result', height='500')
    .hr.contain
    roundtripTable(:roundtrips='result.roundtrips')
</template>

<script>
import resultSummary from './summary.vue'
import chart from './chartWrapper.vue'
import roundtripTable from './roundtripTable.vue'
import backtestResultChart from './backtestResultChart.vue'

export default {
  props: ['result'],
  data: () => {
    return {}
  },
  methods: {},
  components: {
    roundtripTable,
    resultSummary,
    chart,
    backtestResultChart
  }
}
</script>

<style>
</style>
