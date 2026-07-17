import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target1 = """                        const statusOptions = [
                          'Ready for Delivery',
                          'Sent to Client',
                          'Delivered',
                          'Pending Approval',
                          'Completed'
                        ];"""

replacement1 = """                        const statusOptions = [
                          'Ready for Delivery',
                          'Sent to Client',
                          'Pending Approval',
                          'Project Completed'
                        ];"""
content = content.replace(target1, replacement1)

target2 = """                          } else if (newStat === 'Delivered') {
                            up = { editing_status: 'Project Delivered', production_status: 'Delivered', delivery_date: new Date().toISOString().split('T')[0] };
                          } else if (newStat === 'Pending Approval') {
                            up = { editing_status: 'Client Review Sent', production_status: 'Customer Review' };
                          } else if (newStat === 'Completed') {
                            up = { editing_status: 'Completed', production_status: 'Closed' };
                          }"""

replacement2 = """                          } else if (newStat === 'Pending Approval') {
                            up = { editing_status: 'Client Review Sent', production_status: 'Customer Review' };
                          } else if (newStat === 'Project Completed') {
                            up = { editing_status: 'Project Completed', production_status: 'Project Completed', delivery_date: new Date().toISOString().split('T')[0] };
                          }"""
content = content.replace(target2, replacement2)

# Now fix the dropdown `{canEdit && (`
# Should be `{canEdit && !isProjectLocked(prod.editing_status) && (`
target3 = "{canEdit && ("
# We'll just replace this one specific occurrence by looking at its context
context_target = """                                }`}>
                                  {currentDeliveryStatus}
                                </span>
                                {/* Dropdown edit */}
                                {canEdit && ("""
context_replace = """                                }`}>
                                  {currentDeliveryStatus}
                                </span>
                                {/* Dropdown edit */}
                                {canEdit && !isProjectLocked(prod.editing_status) && ("""
content = content.replace(context_target, context_replace)

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(content)
print("Updated delivery list dropdown")
