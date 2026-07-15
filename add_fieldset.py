import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target = """                      {/* Single Common Target Delivery Date at the top */}
                      <div id="wf-target-delivery-date-container\""""
replacement = """                      <fieldset disabled={isProjectLocked(activeWorkflowProd?.editing_status)} className="space-y-4">
                      {/* Single Common Target Delivery Date at the top */}
                      <div id="wf-target-delivery-date-container\""""

if target in content:
    content = content.replace(target, replacement)
    
    # Need to close the fieldset at the end of the section
    target2 = """                      {/* Add Custom Deliverable Section */}"""
    replacement2 = """                      </fieldset>
                      <fieldset disabled={isProjectLocked(activeWorkflowProd?.editing_status)}>
                      {/* Add Custom Deliverable Section */}"""
    if target2 in content:
        content = content.replace(target2, replacement2)
    else:
        print("Could not find target2")
        
    target3 = """                      {/* Save Assignment Button */}"""
    replacement3 = """                      </fieldset>
                      <fieldset disabled={isProjectLocked(activeWorkflowProd?.editing_status)}>
                      {/* Save Assignment Button */}"""
    if target3 in content:
        content = content.replace(target3, replacement3)
    else:
        print("Could not find target3")
        
    target4 = """                      {/* Delete Deliverable Button */}"""
    # Wait, the action buttons are at the bottom.
    
    with open("src/components/ProductionModule.tsx", "w") as f:
        f.write(content)
    print("Added fieldset")
else:
    print("Could not find target")

