sed -i '/if (table === '"'"'equipment'"'"') {/i\
    if (table === '"'"'staff_assignments'"'"') {\
      delete cloned.event_id;\
      delete cloned.event_name;\
      delete cloned.equipment;\
      delete cloned.mobile;\
      delete cloned.staff_type;\
      delete cloned.task_status;\
      delete cloned.updated_by;\
    }' src/components/RoleContext.tsx
