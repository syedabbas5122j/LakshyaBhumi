const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 4000
const DATA_PATH = path.join(__dirname, 'data', 'land-intelligence.json')

const readDataset = () => {
  const raw = fs.readFileSync(DATA_PATH, 'utf8')
  return JSON.parse(raw)
}

const sendJson = (res, payload, statusCode = 200) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(payload))
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method !== 'GET') {
    sendJson(res, { error: 'Method not allowed' }, 405)
    return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (url.pathname === '/api/overview') {
    const dataset = readDataset()
    sendJson(res, dataset)
    return
  }

  if (url.pathname === '/api/conflicts') {
    const dataset = readDataset()
    sendJson(res, { conflicts: dataset.conflictRecords })
    return
  }

  if (url.pathname === '/api/districts') {
    const dataset = readDataset()
    sendJson(res, {
      districtGeojson: dataset.districtGeojson,
      mandalGeojson: dataset.mandalGeojson,
      clusterGeojson: dataset.clusterGeojson,
    })
    return
  }

  if (url.pathname === '/api/sources') {
    const dataset = readDataset()
    sendJson(res, { sourceCatalog: dataset.sourceCatalog })
    return
  }

  sendJson(res, { error: 'Not found' }, 404)
})

server.listen(PORT, () => {
  console.log(`BhoomiSync API running on http://localhost:${PORT}`)
})
