import fs from 'fs';
import https from 'https';

const url = "https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/ChatGPT%20Image%20Jun%2019,%202026,%2010_06_51%20AM.png";

https.get(url, (res) => {
  const data = [];
  res.on('data', chunk => data.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    const files = [
      'favicon.ico',
      'favicon-32x32.png',
      'apple-touch-icon.png',
      'android-chrome-192x192.png',
      'android-chrome-512x512.png',
      'favicon-128x128.png',
      'favicon-144x144.png',
      'favicon-152x152.png',
      'favicon-180x180.png',
      'favicon-192x192.png',
      'favicon-384x384.png',
      'favicon-48x48.png',
      'favicon-512x512.png',
      'favicon-72x72.png',
      'favicon-96x96.png'
    ];
    files.forEach(f => {
      fs.writeFileSync('public/' + f, buffer);
    });
    console.log('Icons updated successfully');
  });
}).on('error', err => {
  console.log("Error:", err.message);
});
