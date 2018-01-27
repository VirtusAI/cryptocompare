'use strict'
/* global fetch */
const rp = require('request-promise-cache');
const baseUrl = 'https://min-api.cryptocompare.com/data/'

const cmc2cc = {
    "bytom": "BTM*",
    "bitgem": "BTG*",
    "batcoin": "BAT*",
    "kingn-coin": "KNC*",
    "rcoin": "RCN*",
    "nimiq": "NET*",
    "encryptotel-eth": "ETT*",
    "dao-casino": "BET*",
    "prochain": "PRO*",
    "thegcccoin": "GCC*",
    "bitcoin-silver": "BTCS*",
    "arcade-token": "ARC*",
    "accelerator-network": "ACC*",
    "huncoin": "HNC*",
    "cybermiles": "CMT*",
    "cash-poker-pro": "CASH*",
    "mantracoin": "MNC*",
    "international-diamond": "XID*",
    "qbao": "QBT*",
    "iconomi": "ICN",
    "iota": "IOT"
}

const convert = (cmcId, symbol) => cmcId in cmc2cc ? cmc2cc[cmcId] : symbol;

const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;

function fetchJSON (url, cacheTime=DAY) {
  return rp({
    uri: url,
    json: true,
    cacheKey: url,
    cacheTTL: DAY,
  })
  .then(data => {
    if (data.body.Response === 'Error') throw data.body.Message
    return data.body
  })
}

function getCoinMarketCapCoinList() {
  let url = 'https://api.coinmarketcap.com/v1/ticker?limit=0';
  return rp({
    uri: url,
    json: true,
    cacheKey: url,
    cacheTTL: DAY,
  })
  .then(data => data.body);
}

function exchangeList () {
  const url = `${baseUrl}all/exchanges`
  return fetchJSON(url).then(exchanges => {
    for(let k in exchanges) {
      exchanges[k.toUpperCase()] = exchanges[k];
    }
    return exchanges
  });
}

function coinList () {
  const url = `${baseUrl}all/coinlist`
  return fetchJSON(url, WEEK).then(result => result.Data);
}

function coinListMergeCoinMarketCap () {
  return getCoinMarketCapCoinList()
  .then(cmcList => {
    return coinList()
    .then(ccList => {
      ccList = Object.keys(ccList).map(k => ccList[k]);
      for(let cc of ccList) {
        for(let cmc of cmcList) {
            if(cc.Name === convert(cmc.id, cmc.symbol)) {
                cc.cmcId = cmc.id;
                cc.cmcRank = cmc.rank
                break;
            }
        }
      }
      return ccList.filter(cc => 'cmcId' in cc).sort((a,b) => parseInt(a.cmcRank) - parseInt(b.cmcRank));
    })
  })
}

function price (fsym, tsyms, options) {
  options = options || {}
  let url = `${baseUrl}price?fsym=${fsym}&tsyms=${tsyms}`
  if (options.exchanges) url += `&e=${options.exchanges}`
  if (options.tryConversion === false) url += '&tryConversion=false'
  return fetchJSON(url)
}

function priceMulti (fsyms, tsyms, options) {
  options = options || {}
  let url = `${baseUrl}pricemulti?fsyms=${fsyms}&tsyms=${tsyms}`
  if (options.exchanges) url += `&e=${options.exchanges}`
  if (options.tryConversion === false) url += '&tryConversion=false'
  return fetchJSON(url)
}

function priceFull (fsyms, tsyms, options) {
  options = options || {}
  let url = `${baseUrl}pricemultifull?fsyms=${fsyms}&tsyms=${tsyms}`
  if (options.exchanges) url += `&e=${options.exchanges}`
  if (options.tryConversion === false) url += '&tryConversion=false'
  // We want the RAW data, not the DISPLAY data:
  return fetchJSON(url).then(result => result.RAW)
}

function priceHistorical (fsym, tsyms, time, options) {
  options = options || {}
  time = dateToTimestamp(time)
  let url = `${baseUrl}pricehistorical?fsym=${fsym}&tsyms=${tsyms}&ts=${time}`
  if (options.exchanges) url += `&e=${options.exchanges}`
  if (options.tryConversion === false) url += '&tryConversion=false'
  // The API returns json with an extra layer of nesting, so remove it
  return fetchJSON(url, WEEK).then(result => result[fsym])
}

function generateAvg (fsym, tsym, e, tryConversion) {
  let url = `${baseUrl}generateAvg?fsym=${fsym}&tsym=${tsym}&e=${e}`
  if (tryConversion === false) url += '&tryConversion=false'
  return fetchJSON(url).then(result => result.RAW)
}

function topPairs (fsym, limit) {
  let url = `${baseUrl}top/pairs?fsym=${fsym}`
  if (limit) url += `&limit=${limit}`
  return fetchJSON(url).then(result => result.Data)
}

function topExchanges (fsym, tsym, limit) {
  let url = `${baseUrl}top/exchanges?fsym=${fsym}&tsym=${tsym}`
  if (limit) url += `&limit=${limit}`
  return fetchJSON(url).then(result => result.Data)
}

function histoDay (fsym, tsym, options) {
  options = options || {}
  if (options.timestamp) options.timestamp = dateToTimestamp(options.timestamp)
  let url = `${baseUrl}histoday?fsym=${fsym}&tsym=${tsym}`
  if (options.exchange) url += `&e=${options.exchange}`
  if (options.limit === 'none') url += '&allData=true'
  else if (options.limit) url += `&limit=${options.limit}`
  if (options.tryConversion === false) url += '&tryConversion=false'
  if (options.aggregate) url += `&aggregate=${options.aggregate}`
  if (options.timestamp) url += `&toTs=${options.timestamp}`
  return fetchJSON(url).then(result => result.Data)
}

function histoHour (fsym, tsym, options) {
  options = options || {}
  if (options.timestamp) options.timestamp = dateToTimestamp(options.timestamp)
  let url = `${baseUrl}histohour?fsym=${fsym}&tsym=${tsym}`
  if (options.exchange && options.exchange !== 'CCCAGG') url += `&e=${options.exchange}`
  // if (options.limit) url += `&limit=${options.limit}`
  // if (options.tryConversion === false) url += '&tryConversion=false'

  url += '&allData=true&limit=2000&tryConversion=false';
  // if (options.aggregate) url += `&aggregate=${options.aggregate}`
  // if (options.timestamp) url += `&toTs=${options.timestamp}`
  return fetchJSON(url).then(result => result.Data)
}

function histoMinute (fsym, tsym, options) {
  options = options || {}
  if (options.timestamp) options.timestamp = dateToTimestamp(options.timestamp)
  let url = `${baseUrl}histominute?fsym=${fsym}&tsym=${tsym}`
  if (options.exchange) url += `&e=${options.exchange}`
  if (options.limit) url += `&limit=${options.limit}`
  if (options.tryConversion === false) url += '&tryConversion=false'
  if (options.aggregate) url += `&aggregate=${options.aggregate}`
  if (options.timestamp) url += `&toTs=${options.timestamp}`
  return fetchJSON(url).then(result => result.Data)
}

function dateToTimestamp (date) {
  if (!(date instanceof Date)) throw new Error('timestamp must be an instance of Date.')
  return Math.floor(date.getTime() / 1000)
}

module.exports = {
  coinList,
  exchangeList,
  price,
  priceMulti,
  priceFull,
  priceHistorical,
  generateAvg,
  topPairs,
  topExchanges,
  histoDay,
  histoHour,
  histoMinute,
  coinListMergeCoinMarketCap
}
