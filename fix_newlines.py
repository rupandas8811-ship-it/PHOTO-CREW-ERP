import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

bad_str = """                              const text = `*Event Schedule & Assignment*\\n\\n`
                                + `Customer: ${activeOrderInstance?.customer_name}\\n`
                                + `Event: ${ev.event_type === 'Other' ? ev.event_name : ev.event_type}\\n`
                                + `Location: ${parentLeadInstance?.event_location}\\n`
                                + `Reporting: ${allocation.reporting_date} at ${allocation.reporting_time}\\n\\n`
                                + `*Team:*\\n` + allocStaff.map(s => `- ${s.staff_role}: ${s.staff_name}`).join('\\n');"""

# Actually, the python script in patch_ops_3.py had:
# const text = `*Event Schedule & Assignment*\n\n`
# so the actual content inside the file has literal newlines inside the template literals.

# But wait, literal newlines inside backticks (`...`) ARE valid in JS/TS!
# The problem is the .join('\n') at the end which was rendered as:
# .join('
# ');
# This is a syntax error because it's single quotes ('), not backticks.

# So let's replace:
# .join('
# ');
# with .join('\\n');
