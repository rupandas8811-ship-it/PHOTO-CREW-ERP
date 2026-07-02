const fs = require('fs');
let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');

const injection = `
    const leadEventsChannel = supabaseClient.channel('rt-lead_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_events' }, (payload) => {
        updateDiagnosticMetric('realtime', 'ok');
        fetchFromDb(false); // Refetch to keep simple since events are merged into leads
      })
      .subscribe();
`;

code = code.replace(
    'return () => {\n      subscription.unsubscribe();',
    `return () => {\n      subscription.unsubscribe();\n      leadEventsChannel.unsubscribe();`
);

// We need to inject this after the channels.map(...).subscribe()
// But actually `channels.map()` doesn't `.subscribe()` inline. Let's see how they subscribe.
