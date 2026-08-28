#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");

const ROOT = path.join(__dirname, "..");
const sources = Object.fromEntries(
  ["JobenAttestationRegistry.sol", "JobenAdmissionGate.sol"].map((name) => [
    name,
    { content: fs.readFileSync(path.join(ROOT, "contracts", name), "utf8") },
  ]),
);

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors || []).filter((item) => item.severity === "error");
if (errors.length) {
  console.error(errors.map((item) => item.formattedMessage).join("\n"));
  process.exitCode = 1;
} else {
  for (const name of ["JobenAttestationRegistry", "JobenAdmissionGate"]) {
    const artifact = output.contracts?.[`${name}.sol`]?.[name];
    if (!artifact?.abi || !artifact.evm?.bytecode?.object) {
      throw new Error(`SOLIDITY_ARTIFACT_MISSING: ${name}`);
    }
    console.log(`${name}: ABI ${artifact.abi.length} entries, bytecode ${artifact.evm.bytecode.object.length / 2} bytes`);
  }
}