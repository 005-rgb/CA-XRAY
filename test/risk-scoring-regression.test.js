const test = require("node:test");
const assert = require("node:assert/strict");
const {
  STATUS,
  createDemoScan,
  calculateCategoryScores,
  verifyCapabilitySignals,
} = require("../src/engine");
const { normalizeGoPlus, normalizeDexScreener } = require("../src/providers/default-adapters");

const pepe = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";
const zero = "0x0000000000000000000000000000000000000000";

test("PEPE-style bytecode signal without ABI confirmation is unverified and low confidence", () => {
  const result = normalizeGoPlus({
    response: {
      code: 1,
      result: {
        [pepe]: {
          token_name: "Pepe",
          token_symbol: "PEPE",
          owner_address: zero,
          is_open_source: "1",
          is_blacklisted: "1",
          transfer_pausable: "1",
          anti_whale_modifiable: "1",
        },
      },
    },
    retrievedAt: "2026-08-23T00:00:00.000Z",
    network: { goplusChainId: "1" },
    providerId: "goplus-security",
  });
  const security = result.evidence.security;
  assert.equal(security.canBlacklist.status, STATUS.UNVERIFIED_SIGNAL);
  assert.equal(security.canBlacklist.confidence, "LOW");
  assert.equal(security.canPause.status, STATUS.UNVERIFIED_SIGNAL);
  assert.deepEqual(
    verifyCapabilitySignals({ canBlacklist: true }, { verifiedAbi: ["transfer", "approve"], sourceVerified: true }),
    { canBlacklist: false },
  );
});

test("renounced ownership reduces owner-only control but active proxy admin remains risky", () => {
  const scan = createDemoScan("high");
  scan.contract.address = pepe;
  scan.security.ownerAddress.value = zero;
  scan.security.ownerControl.value = "RENOUNCED";
  scan.security.isUpgradeable.value = false;
  const renouncedRisk = calculateCategoryScores(scan);

  scan.security.isUpgradeable.value = true;
  scan.security.proxyAdminActive = { value: true, status: STATUS.DEMO, evidenceStatus: "valid" };
  const proxyRisk = calculateCategoryScores(scan);
  assert.ok(renouncedRisk.categories.contract.score < proxyRisk.categories.contract.score);
  assert.ok(proxyRisk.categories.contract.score > 0);
});

test("DexScreener metadata keeps source distinctions and pair age semantics", () => {
  const result = normalizeDexScreener({
    response: {
      pairs: [{
        chainId: "ethereum",
        baseToken: { address: pepe, name: "Pepe", symbol: "PEPE" },
        pairAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        pairCreatedAt: 1750000000000,
        info: {
          websites: [{ url: "https://pepe.example" }],
          socials: [{ type: "twitter", url: "https://x.com/pepe" }],
        },
      }],
    },
    retrievedAt: "2026-08-23T00:00:00.000Z",
    network: { dexChainId: "ethereum" },
    address: pepe,
    providerId: "dexscreener",
  });
  assert.equal(result.evidence.project.website.value, "https://pepe.example");
  assert.deepEqual(result.evidence.project.socials.value, ["https://x.com/pepe"]);
  assert.equal(result.evidence.liquidity.pairAge.status, "VERIFIED");
  assert.equal(result.evidence.token.decimals, undefined);
});