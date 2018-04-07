<template lang='jade'>
  div
    #top
    header.bg--off-white.grd
    nav
      .menu.contain
        router-link(to='/home') Home
        router-link(to='/live-gekkos') Live Gekkos
        router-link(to='/backtest') Backtest
        router-link(to='/data') Local data
        router-link(to='/config') Config
        a(href='https://gekko.wizb.it/docs/introduction/about_gekko.html', target='_blank') Documentation

</template>

<script>
export default {}
</script>

<style>
.menu {
  display: flex;
  width: 100%;
  flex-direction: row;
  margin-top: 0;
  margin-bottom: 2rem;
}

.menu a {
  flex: 1 1 100%;
  display: block;
  text-align: center;
  text-decoration: none;
  color: white;
}

.menu a.router-link-active {
  color: #131313;
}

.menu .router-link-active {
  background-color: rgba(250,250,250,.99);
}

.menu a:hover {
  text-decoration: underline;
}

nav {
  background: rgba(33, 75, 169, 0.99)
}

nav a {
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
}

</style>
