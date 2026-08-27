with open('src/utils/orderStageCalculator.ts', 'r') as f:
    content = f.read()

target = """    if (bsLower === 'operations assigned' || bsLower === 'event scheduled') {
      calculatedStage = baseStage;
    } else {"""
repl = """    if (bsLower === 'operations assigned' || bsLower === 'event scheduled' || bsLower === 'pending / partially assigned') {
      calculatedStage = baseStage;
    } else {"""

if target in content:
    content = content.replace(target, repl)
    with open('src/utils/orderStageCalculator.ts', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO MATCH")
