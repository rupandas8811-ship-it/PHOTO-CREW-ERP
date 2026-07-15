import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target = """                    const postProdStages = [
                      'Raw Footage Received', 
                      'Editor Assigned', 
                      'Editing Started', 
                      'Editing In Progress', 
                      'Internal QC Review', 
                      'Client Review Sent', 
                      'Revision Required', 
                      'Revision In Progress', 
                      'Final Approval', 
                      'Delivered', 
                      'Closed',
                      'Customer Review',
                      'Approved',
                      'Payment Pending'
                    ];"""

replacement = """                    const postProdStages = [
                      'Raw Footage Received', 
                      'Editor Assigned', 
                      'Editing Started', 
                      'Editing In Progress', 
                      'Internal QC Review', 
                      'Client Review Sent', 
                      'Revision Required', 
                      'Revision In Progress', 
                      'Final Approval', 
                      'Delivered', 
                      'Closed',
                      'Customer Review',
                      'Approved',
                      'Payment Pending',
                      'Project Completed',
                      'Project Cancelled'
                    ];"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/ProductionModule.tsx", "w") as f:
        f.write(content)
    print("Updated second postProdStages")
else:
    print("Could not find second postProdStages")

