const test = require("node:test");
const assert = require("node:assert/strict");
const {
  collectIndexerTransfers,
  transferFromIndexer,
} = require("../src/providers/evm-evidence");

const tokenAddress = "0x1111111111111111111111111111111111111111";
const from = "0x2222222222222222222222222222222222222222";
const to = "0x3333333333333333333333333333333333333333";

function transfer({ hash, logIndex, amount = "10" }) {
  return {
    tx_hash: hash,
    block_number: 100,
    log_index: logIndex,
    from: { hash: from },
    to: { hash: to },
    total: { value: amount },
  };
}

test("transfer normalization accepts decimal and ABI hex amounts", () => {
  assert.equal(transferFromIndexer(transfer({ hash: "0xaaa", logIndex: 1, amount: "42" })).amount, "42");
  assert.equal(transferFromIndexer(transfer({ hash: "0xbbb", logIndex: 2, amount: "0x2a" })).amount, "42");
  assert.equal(transferFromIndexer(transfer({ hash: "0xccc", logIndex: 3, amount: "not-a-number" })), null);
});

test("indexer traversal resumes from a cursor, deduplicates, and returns complete only when exhausted", async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (input) => {
    const url = new URL(input);
    requests.push(Object.fromEntries(url.searchParams.entries()));
    const page = url.searchParams.get("page");
    const body = page === "2"
      ? { items: [transfer({ hash: "0xaaa", logIndex: 1 }), transfer({ hash: "0xbbb", logIndex: 2 })] }
      : { items: [transfer({ hash: "0xaaa", logIndex: 1 })], next_page_params: { page: "2", block_number: "100" } };
    return { ok: true, async json() { return body; } };
  };

  try {
    const result = await collectIndexerTransfers({
      blockscoutHost: "eth.blockscout.com",
      tokenAddress,
      timeoutMs: 100,
      maxPages: 10,
      budgetMs: 5_000,
      cursor: { page: "1" },
    });
    assert.equal(result.status, "COMPLETE");
    assert.equal(result.pages, 2);
    assert.equal(result.nextCursor, null);
    assert.equal(result.transfers.length, 2);
    assert.deepEqual(requests, [
      { page: "1" },
      { page: "2", block_number: "100" },
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("pagination safety limit exposes the exact continuation cursor", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        items: [transfer({ hash: "0xaaa", logIndex: 1 })],
        next_page_params: { page: "next", block_number: "100" },
      };
    },
  });

  try {
    const result = await collectIndexerTransfers({
      blockscoutHost: "eth.blockscout.com",
      tokenAddress,
      timeoutMs: 100,
      maxPages: 1,
      budgetMs: 5_000,
    });
    assert.equal(result.status, "PARTIAL");
    assert.deepEqual(result.nextCursor, { page: "next", block_number: "100" });
    assert.equal(result.transfers.length, 1);
  } finally {
    global.fetch = originalFetch;
  }
});