import fs from 'fs';
const content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// The file currently ends with:
//                         </button>
//                       </div>
//                     </form>
//                   </motion.div>
//                 </div>
//               )}
//             </AnimatePresence>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };
// 
// export default ProductionModule;

const splitIndex = content.indexOf('</button>\n                      </div>\n                    </form>');
if (splitIndex !== -1) {
    const keep = content.substring(0, splitIndex + '</button>\n                      </div>\n                    </form>'.length);
    const correctEnding = `
                  );
                })()} 
              </div>
            </div>
          </div>
        );
      })()} 
    </div>
  );
};
export default ProductionModule;`;
    fs.writeFileSync('src/components/ProductionModule.tsx', keep + correctEnding);
    console.log("Replaced successfully!");
} else {
    console.log("Could not find split index");
}
