const express = require('express');
const router = express.Router();

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Al Futtaim Automotive API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1a2e; color: #e0e0e0; }
    .header { background: linear-gradient(135deg, #041E42 0%, #163E93 100%); padding: 32px 40px; border-bottom: 3px solid #E6A817; }
    .header h1 { font-size: 28px; color: #fff; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.6); margin-top: 6px; font-size: 14px; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px 40px; }
    .domain { margin-bottom: 32px; }
    .domain-title { font-size: 18px; font-weight: 700; color: #E6A817; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .endpoint { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
    .endpoint-header { display: flex; align-items: center; padding: 12px 16px; cursor: pointer; gap: 12px; }
    .endpoint-header:hover { background: rgba(255,255,255,0.03); }
    .method { color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; min-width: 52px; text-align: center; }
    .method-GET { background: #163E93; }
    .method-POST { background: #1a8a3f; }
    .method-PUT { background: #c07b1a; }
    .method-DELETE { background: #b33030; }
    .path { font-family: 'SF Mono', Monaco, monospace; font-size: 14px; color: #30A3DA; flex: 1; }
    .desc { color: rgba(255,255,255,0.5); font-size: 13px; }
    .endpoint-body { padding: 0 16px 16px; display: none; }
    .endpoint.open .endpoint-body { display: block; }
    .params { margin-top: 8px; }
    .params h4 { font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .param { display: flex; gap: 8px; padding: 4px 0; font-size: 13px; }
    .param-name { font-family: monospace; color: #E6A817; min-width: 80px; }
    .param-desc { color: rgba(255,255,255,0.5); }
    .param-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
    .param-label { font-family: monospace; color: #E6A817; min-width: 80px; font-size: 13px; }
    .param-input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; padding: 6px 10px; color: #fff; font-size: 12px; font-family: monospace; outline: none; }
    .param-input:focus { border-color: #E6A817; }
    .param-input::placeholder { color: rgba(255,255,255,0.25); font-family: -apple-system, sans-serif; }
    .try-row { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
    .try-btn { background: #E6A817; color: #000; border: none; padding: 8px 20px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .try-btn:hover { background: #d4981a; }
    .try-btn-mock { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.5); border: 1px dashed rgba(255,255,255,0.2); }
    .try-btn-mock:hover { background: rgba(255,255,255,0.18); color: rgba(255,255,255,0.7); }
    .mock-banner { display: flex; align-items: center; gap: 8px; background: rgba(230,168,23,0.1); border: 1px solid rgba(230,168,23,0.25); border-radius: 6px; padding: 10px 14px; margin-top: 10px; font-size: 12px; color: #E6A817; }
    .mock-banner span { color: rgba(255,255,255,0.45); font-size: 12px; }
    .try-url { font-family: monospace; font-size: 11px; color: rgba(255,255,255,0.3); word-break: break-all; }
    .response { margin-top: 10px; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow: auto; display: none; color: #c6c6c6; }
    .response.visible { display: block; }
    .badge { display: inline-block; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 10px; font-size: 11px; color: rgba(255,255,255,0.4); margin-left: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Al Futtaim Automotive API</h1>
    <p>Executive BI Dashboard — Data Endpoints</p>
  </div>
  <div class="container" id="content"></div>

  <script>
    const BASE = window.location.origin;
    const DOMAINS = [
      {
        name: 'Market Intelligence',
        endpoints: [
          { method: 'GET', path: '/api/market-intelligence/overview', desc: 'Country cards — raw market size & share numbers', params: [{ name: 'month', desc: 'YYYY-MM (default: current)' }, { name: 'period', desc: 'MTD or YTD (default: MTD)' }, { name: 'country', desc: 'Filter by country ID (optional)' }] },
          { method: 'GET', path: '/api/market-intelligence/detail', desc: 'Brand market share by country — raw numbers', params: [{ name: 'country', desc: 'Country ID: uae, ksa, oman, qatar, egypt, srilanka (required)' }, { name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }, { name: 'brand', desc: 'Filter by brand name (optional)' }] },
          { method: 'GET', path: '/api/market-intelligence/competition', desc: 'Top 10 brands, winners & losers — raw numbers', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }, { name: 'brand', desc: 'Filter by brand name (optional)' }] },
          { method: 'GET', path: '/api/market-intelligence/geo', desc: 'Static geographic config (coordinates, cameras)', params: [] },
        ]
      },
      {
        name: 'Sales Insights',
        endpoints: [
          { method: 'GET', path: '/api/sales-insights/overview', desc: 'Sales KPIs, country & brand breakdown, sales plan — raw numbers', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }, { name: 'country', desc: 'Filter by country (optional)' }, { name: 'brand', desc: 'Filter by brand (optional)' }] },
          { method: 'GET', path: '/api/sales-insights/daily', desc: 'Daily sales: date, units, cumulative', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }, { name: 'country', desc: 'Filter (optional)' }, { name: 'brand', desc: 'Filter (optional)' }] },
          { method: 'GET', path: '/api/sales-insights/model-channel', desc: 'Sales by model and channel — raw numbers', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }, { name: 'country', desc: 'Filter (optional)' }, { name: 'brand', desc: 'Filter (optional)' }] },
          { method: 'GET', path: '/api/sales-insights/showroom', desc: 'Showroom performance — raw numbers', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }, { name: 'showroom', desc: 'Filter by showroom name (optional)' }] },
        ]
      },
      {
        name: 'Lead Management',
        endpoints: [
          { method: 'GET', path: '/api/lead-management/overview', desc: 'Lead funnel, conversion rates, lost reasons', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
          { method: 'GET', path: '/api/lead-management/brands', desc: 'Lead metrics by brand and region', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
        ]
      },
      {
        name: 'Customer Intelligence',
        endpoints: [
          { method: 'GET', path: '/api/customer-intelligence/overview', desc: 'Customer KPIs & demographics', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
          { method: 'GET', path: '/api/customer-intelligence/sentiment', desc: 'Sentiment analysis by topic', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
          { method: 'GET', path: '/api/customer-intelligence/brand-comparison', desc: 'Brand comparison metrics', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
        ]
      },
      {
        name: 'Financial Intelligence',
        endpoints: [
          { method: 'GET', path: '/api/financial-intelligence/overview', desc: 'Revenue, EBIT, ROCE & monthly forecast', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
          { method: 'GET', path: '/api/financial-intelligence/profitability', desc: 'Brand-level profitability', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
          { method: 'GET', path: '/api/financial-intelligence/indirect-costs', desc: 'Indirect cost categories', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
          { method: 'GET', path: '/api/financial-intelligence/fcf', desc: 'Free cash flow waterfall', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
        ]
      },
      {
        name: 'Stock & Logistics',
        endpoints: [
          { method: 'GET', path: '/api/stock-logistics/overview', desc: 'Stock KPIs, brand stock levels, run-down', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
          { method: 'GET', path: '/api/stock-logistics/logistics', desc: 'Supply pipeline & brand logistics', params: [{ name: 'month', desc: 'YYYY-MM' }, { name: 'period', desc: 'MTD or YTD' }] },
        ]
      },
      {
        name: 'Designs',
        endpoints: [
          { method: 'GET', path: '/api/designs', desc: 'List all designs with full overrides & baseSnapshot', params: [] },
          { method: 'GET', path: '/api/designs/:file', desc: 'Get a single design by filename', params: [{ name: 'file', desc: 'Design filename, e.g. default.json' }] },
          { method: 'POST', path: '/api/designs', desc: 'Create or upsert a design', params: [{ name: 'body', desc: '{ name, designerName, description, overrides, baseSnapshot }' }] },
          { method: 'PUT', path: '/api/designs/:file', desc: 'Update design fields', params: [{ name: 'file', desc: 'Design filename' }, { name: 'body', desc: '{ overrides, comment, name, designerName, description }' }] },
          { method: 'DELETE', path: '/api/designs/:file', desc: 'Delete a design', params: [{ name: 'file', desc: 'Design filename' }] },
        ]
      },
    ];

    const container = document.getElementById('content');
    let epCounter = 0;

    const DEFAULTS = { month: '2026-03', period: 'MTD', country: '', brand: '', showroom: '', file: 'default.json' };

    DOMAINS.forEach(domain => {
      const section = document.createElement('div');
      section.className = 'domain';
      section.innerHTML = '<div class="domain-title">' + domain.name + ' <span class="badge">' + domain.endpoints.length + ' endpoints</span></div>';

      domain.endpoints.forEach(ep => {
        const eid = 'ep-' + (epCounter++);
        const queryParams = ep.params.filter(p => p.name !== 'body');

        const inputsHtml = queryParams.length ? '<div class="params"><h4>Parameters</h4>' +
          queryParams.map(p => {
            const def = DEFAULTS[p.name] || '';
            const req = p.desc.includes('required') ? ' *' : '';
            return '<div class="param-row">' +
              '<label class="param-label">' + p.name + req + '</label>' +
              '<input class="param-input" data-param="' + p.name + '" data-ep="' + eid + '" value="' + def + '" placeholder="' + p.desc + '" />' +
            '</div>';
          }).join('') + '</div>' : '';

        const div = document.createElement('div');
        div.className = 'endpoint';
        div.id = eid;
        div.innerHTML =
          '<div class="endpoint-header" onclick="this.parentElement.classList.toggle(\\'open\\')">' +
            '<span class="method method-' + ep.method + '">' + ep.method + '</span>' +
            '<span class="path">' + ep.path + '</span>' +
            '<span class="desc">' + ep.desc + '</span>' +
          '</div>' +
          '<div class="endpoint-body">' +
            inputsHtml +
            (ep.method === 'GET'
              ? '<div class="try-row"><button class="try-btn" onclick="tryIt(\\'' + eid + '\\', \\'' + ep.path + '\\')">Execute</button><span class="try-url" id="url-' + eid + '"></span></div>'
              : '<div class="try-row"><button class="try-btn try-btn-mock" onclick="mockIt(\\'' + eid + '\\', \\'' + ep.method + '\\', \\'' + ep.path + '\\')">Execute (Mock)</button></div>') +
            '<pre class="response" id="res-' + eid + '"></pre>' +
          '</div>';
        section.appendChild(div);
      });

      container.appendChild(section);
    });

    const MOCK_RESPONSES = {
      POST: { ok: true, message: 'Design created successfully', file: 'example-design.json', id: '507f1f77bcf86cd799439011' },
      PUT:  { ok: true, message: 'Design updated successfully' },
      DELETE: { ok: true, message: 'Design deleted successfully' },
    };

    function mockIt(eid, method, path) {
      const pre = document.getElementById('res-' + eid);
      pre.className = 'response visible';
      pre.innerHTML = '<span style="color:#E6A817;">Mock Response</span> <span style="color:rgba(255,255,255,0.35);">— No actual API call was made</span>\\n\\n' + JSON.stringify(MOCK_RESPONSES[method] || { ok: true }, null, 2);
    }

    function tryIt(eid, path) {
      const inputs = document.querySelectorAll('input[data-ep="' + eid + '"]');
      let resolvedPath = path;
      const queryParams = [];
      inputs.forEach(inp => {
        const val = inp.value.trim();
        if (!val) return;
        const name = inp.dataset.param;
        // If path contains :param, substitute it in the URL path
        if (resolvedPath.includes(':' + name)) {
          resolvedPath = resolvedPath.replace(':' + name, encodeURIComponent(val));
        } else {
          queryParams.push(name + '=' + encodeURIComponent(val));
        }
      });
      const url = BASE + resolvedPath + (queryParams.length ? '?' + queryParams.join('&') : '');
      const urlEl = document.getElementById('url-' + eid);
      if (urlEl) urlEl.textContent = url;
      const pre = document.getElementById('res-' + eid);
      pre.className = 'response visible';
      pre.textContent = 'Loading...';
      fetch(url).then(r => r.json()).then(data => {
        pre.textContent = JSON.stringify(data, null, 2);
      }).catch(e => {
        pre.textContent = 'Error: ' + e.message;
      });
    }
  </script>
</body>
</html>`;

router.get('/', (req, res) => {
  res.type('html').send(HTML);
});

module.exports = router;
