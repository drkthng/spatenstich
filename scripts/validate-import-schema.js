#!/usr/bin/env node
// Validates all reference payloads against the spatenstich-import v1 schema.
// Usage: node scripts/validate-import-schema.js

const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const path = require('path');
const fs = require('fs');

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const schemaPath = path.join(__dirname, '..', 'schemas', 'spatenstich-import.v1.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validate = ajv.compile(schema);

const payloads = ['full', 'minimal', 'edge-cases'];
let allValid = true;

for (const name of payloads) {
  const filePath = path.join(__dirname, '..', 'schemas', 'examples', `${name}.json`);
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const valid = validate(payload);
  if (!valid) {
    console.error(`INVALID: ${name}.json`);
    console.error(JSON.stringify(validate.errors, null, 2));
    allValid = false;
  } else {
    console.log(`VALID: ${name}.json`);
  }
}

if (!allValid) {
  process.exit(1);
} else {
  console.log('\nAll payloads valid against spatenstich-import.v1 schema.');
}
