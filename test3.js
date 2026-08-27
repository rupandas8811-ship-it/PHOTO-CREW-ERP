import fs from 'fs';
const content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');
const updated = content.replace(
    '</button>\n                      </div>\n                    </form>\n                  </motion.div>\n                </div>\n              )}\n            </AnimatePresence>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n};\nexport default ProductionModule;',
    '</button>\n                      </div>\n                    </form>\n                  );\n                })()} \n              </div>\n            </div>\n          </div>\n        );\n      })()} \n    </div>\n  );\n};\nexport default ProductionModule;'
);
fs.writeFileSync('src/components/ProductionModule.tsx', updated);
