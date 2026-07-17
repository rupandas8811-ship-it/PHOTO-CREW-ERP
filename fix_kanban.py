import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target = """                                if (cur === 'Client Review Sent') nextStage = 'Final Approval';
                                else if (cur === 'Revision Required') nextStage = 'Revision In Progress';
                                else if (cur === 'Revision In Progress') nextStage = 'Final Approval';
                                else if (cur === 'Final Approval') nextStage = 'Project Delivered';
                                else if (cur === 'Project Delivered') nextStage = 'Completed';
                                else nextStage = cur;
                                
                                if (prod.editing_status !== 'Completed') {
                                  updateProduction(prod.production_id, { editing_status: nextStage });
                                }
                              }}
                              disabled={prod.editing_status === 'Completed'}"""

replacement = """                                if (cur === 'Client Review Sent') nextStage = 'Final Approval';
                                else if (cur === 'Revision Required') nextStage = 'Revision In Progress';
                                else if (cur === 'Revision In Progress') nextStage = 'Final Approval';
                                else if (cur === 'Final Approval') nextStage = 'Project Completed';
                                else nextStage = cur;
                                
                                if (!isProjectLocked(prod.editing_status)) {
                                  updateProduction(prod.production_id, { editing_status: nextStage });
                                }
                              }}
                              disabled={isProjectLocked(prod.editing_status)}"""
                              
if target in content:
    content = content.replace(target, replacement)
    with open("src/components/ProductionModule.tsx", "w") as f:
        f.write(content)
    print("Fixed kanban next button")
else:
    print("Could not find kanban next button target")

