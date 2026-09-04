const https = require('https');
const options = {
  hostname: 'aqifyxsimhqayfjwzzwj.supabase.co',
  path: '/rest/v1/',
  headers: { 'apikey': 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB' }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
        const json = JSON.parse(data);
        console.log(Object.keys(json.definitions || {}));
    } catch(e) { console.error(e) }
  });
});
