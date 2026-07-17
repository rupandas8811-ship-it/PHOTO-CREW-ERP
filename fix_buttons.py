with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target1 = """                                  className="px-3 py-1.5 bg-purple-600 border border-purple-500 text-white hover:bg-purple-500 hover:border-purple-400 transition-all text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer inline-flex items-center gap-1"
                                >
                                  <span>👤</span> Assign Editor"""

replace1 = """                                  className="px-3 py-1.5 bg-purple-600 border border-purple-500 text-white hover:bg-purple-500 hover:border-purple-400 transition-all text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={isProjectLocked(prod.editing_status)}
                                >
                                  <span>👤</span> Assign Editor"""
                                  
content = content.replace(target1, replace1)

target2 = """                                  className="w-full max-w-[160px] px-3 py-1.5 bg-purple-600 border border-purple-500 text-white hover:bg-purple-500 hover:border-purple-400 transition-all text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <span>👤</span> Assign Editor"""
                                  
replace2 = """                                  className="w-full max-w-[160px] px-3 py-1.5 bg-purple-600 border border-purple-500 text-white hover:bg-purple-500 hover:border-purple-400 transition-all text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={isProjectLocked(prod.editing_status)}
                                >
                                  <span>👤</span> Assign Editor"""
                                  
content = content.replace(target2, replace2)

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(content)
