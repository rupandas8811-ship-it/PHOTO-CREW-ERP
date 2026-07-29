import { supabaseClient } from './src/supabaseClient.ts';
async function test() {
  const { data, error } = await supabaseClient.storage.from('img').upload('test.txt', 'hello');
  console.log(data, error);
}
test();
