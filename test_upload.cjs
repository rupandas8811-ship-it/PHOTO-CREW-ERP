const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
async function test() {
  const { data, error } = await supabaseClient.storage.from('img').upload('test.png', 'hello', { contentType: 'image/png' });
  console.log(data, error);
}
test();
