const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

const newFunctions = `
  const [isFetchingModalData, setIsFetchingModalData] = useState(false);

  const openEquipmentVerification = async (member: any, ord: any, memberEvId: string, assetCollection: any, eqHandover: any) => {
    setIsFetchingModalData(true);
    try {
      let taskDetails = undefined;
      if (member.assignment_id) {
        const { data, error } = await supabaseClient
          .from('v_task_assignment_details')
          .select('*')
          .eq('assignment_id', member.assignment_id)
          .single();
        if (!error && data) {
          taskDetails = data;
        }
      }
      setSelectedEquipmentStatus({ 
        staffName: member.staff_name, 
        assignedEquipment: member.effectiveAssignedEq || (member.assigned_equipment || []),
        orderId: ord.order_id,
        eventId: memberEvId,
        assignmentId: member.assignment_id,
        eventName: member.event_name,
        eqReceived: assetCollection, 
        eqHandover,
        taskDetails
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingModalData(false);
    }
  };

  const openEventImages = async (member: any, ord: any, memberEvId: string, assetCollection: any, evStart: any, evEnd: any, eqHandover: any) => {
    setIsFetchingModalData(true);
    try {
      let taskDetails = undefined;
      if (member.assignment_id) {
        const { data, error } = await supabaseClient
          .from('v_task_assignment_details')
          .select('*')
          .eq('assignment_id', member.assignment_id)
          .single();
        if (!error && data) {
          taskDetails = data;
        }
      }
      setSelectedEventImages({ 
        staffName: member.staff_name, 
        orderId: ord.order_id,
        eventId: memberEvId,
        assignmentId: member.assignment_id,
        eventName: member.event_name,
        assetCollection, 
        evStart, 
        evEnd, 
        eqHandover,
        taskDetails
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingModalData(false);
    }
  };
`;

code = code.replace(
  `  const [transactionId, setTransactionId] = useState('');`,
  `  const [transactionId, setTransactionId] = useState('');\n` + newFunctions
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
