import fs from 'fs';
const content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const updated = content.replace(
    '</button>\n                      </div>\n                    </div>\n                  </motion.div>',
    '</button>\n                      </div>\n                    </form>\n                  </motion.div>'
);
fs.writeFileSync('src/components/ProductionModule.tsx', updated);
