import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

// TEC-R87: Numerik-Sperre für den Kern. esquery entfernt Backslashes in Regex, daher Zeichenklassen statt \d und \. Nur src/sim/num.ts darf diese Konstrukte nutzen.
export const simNumericRestrictions = [
  { selector: "BinaryExpression[operator='/']", message: "TEC-R87: Kein '/' im Kern, nutze divBp/mulDiv/divInt aus num.ts." },
  { selector: "AssignmentExpression[operator='/=']", message: "TEC-R87: Kein '/=' im Kern." },
  { selector: "BinaryExpression[operator='**']", message: "TEC-R87: Kein '**' im Kern, nutze Tabellen." },
  {
    selector: "Literal[raw=/^([0-9]*[.][0-9]+|[0-9]+[.]|[0-9]+([.][0-9]+)?[eE][-+]?[0-9]+)$/]",
    message: "TEC-R87: Keine Fließkomma-Literale im Kern, nutze bp (1,0 = 10.000).",
  },
  {
    selector: "MemberExpression[object.name='Math'][property.name=/^(exp|pow|log|log2|log10|log1p|expm1|sqrt|cbrt|random|tanh|sinh|cosh|hypot)$/]",
    message: "TEC-R87: Math.exp/pow/log/sqrt/random sind im Kern verboten.",
  },
  { selector: "MemberExpression[object.name='Date'][property.name='now']", message: "Kein Date.now im Kern." },
  { selector: "NewExpression[callee.name='Date']", message: "Kein Date im Kern." },
  { selector: "MemberExpression[object.name='performance']", message: "Keine Uhrzeit im Kern." },
];

export default tseslint.config(
  { ignores: ["dist", "node_modules", "reports"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Desktop-Hülle: Electron-Hauptprozess mit Node- und Fetch-Globals.
    files: ["electron/**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["src/sim/**/*.ts"],
    ignores: ["src/sim/num.ts"],
    rules: { "no-restricted-syntax": ["error", ...simNumericRestrictions] },
  },
  {
    // TEC-R08: Kern importiert nichts aus ui/ oder worker/.
    files: ["src/sim/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/ui/**", "**/worker/**", "react", "react-dom"], message: "TEC-R08: src/sim ist reiner Kern." }] },
      ],
    },
  },
  {
    // TEC-T08: Die Oberfläche importiert aus dem Kern nur Typen.
    files: ["src/ui/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/sim/**", "**/mods/**"], allowTypeImports: true, message: "TEC-T08: UI importiert aus dem Kern nur Typen." }] },
      ],
    },
  },
);
