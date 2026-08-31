const fs = require('fs');
let code = fs.readFileSync('src/components/OrderHistoryModal.tsx', 'utf8');

// 1. Fix z-indexes
code = code.replace(/z-\\[250\\]/g, 'z-[100000]');
code = code.replace(/z-\\[90\\]/g, 'z-[100005]');
code = code.replace(/z-\\[100\\]/g, 'z-[100006]');
code = code.replace(/z-\\[300\\]/g, 'z-[100010]');

// 2. Add useEffect for scroll locking
const reactImport = "import React, { useState, useMemo, useEffect } from 'react';";
code = code.replace(/import React, { useState, useMemo } from 'react';/, reactImport);

const useEffectCode = `
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleSection = (section: string) => {`;

code = code.replace(/  const toggleSection = \\(section: string\\) => {/, useEffectCode);

// 3. Remove Roadmap Stepper Bar
const stepperBarRegex = /\{\/\* ROADMAP MACRO MILESTONE STEPPER BAR \*\/\}[\\s\\S]*?\{\/\* SUBTAB NAVIGATION & SEARCH BAR \*\/\}/;
code = code.replace(stepperBarRegex, '{/* SUBTAB NAVIGATION & SEARCH BAR */}');

fs.writeFileSync('src/components/OrderHistoryModal.tsx', code);
