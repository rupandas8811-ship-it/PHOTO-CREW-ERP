import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function testSave() {
  const payload = [
    {
      "assignment_id": "ASST-OR054-d5c3466d19-CrewMember-0",
      "order_id": "OR054",
      "staff_role": "Crew Members",
      "staff_id": "STF-5234",
      "staff_name": "AKASH",
      "event_id": "953c68ab-61b8-41b1-be80-bdd5c3466d19",
      "equipment": [
        "DIGITEK BACKGROUND LIGHT"
      ]
    },
    {
      "assignment_id": "ASST-OR054-eae7a10358-CrewMember-0",
      "order_id": "OR054",
      "staff_role": "Crew Members  ",
      "staff_id": "STF-5234",
      "staff_name": "AKASH",
      "event_id": "f1f41619-303c-4b5c-937c-ffeae7a10358",
      "equipment": [
        "Equipment B"
      ]
    }
  ];
  
  for (const a of payload) {
     await supabase.from('staff_assignments').update({ equipment: a.equipment }).eq('assignment_id', a.assignment_id);
  }
  console.log("Updated DB directly");
}
testSave();
