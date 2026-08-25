const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const OWNERSHIP_TRANSFERRED_TOPIC = "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0";

const ROUTERS = Object.freeze({
  ethereum: { address: "0x7a250d5630b4cf539739df2c5dacab4c659f2488", wrapped: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
  bsc: { address: "0x10ed43c718714eb63d5aa57b78b54704e256024e", wrapped: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c" },
  base: { address: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24", wrapped: "0x4200000000000000000000000000000000000006" },
  polygon: { address: "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff", wrapped: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270" },
  arbitrum: { address: "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506", wrapped: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1" },
});

function hexWord(value) {
  return String(value).replace(/^0x/, "").padStart(64, "0");
}

function addressArg(value) {
  if (!/^0x[a-f0-9]{40}$/i.test(String(value || ""))) return null;
  return hexWord(value.toLowerCase());
}

function callData(selector, args = []) {
  return `0x${selector}${args.map(hexWord).join("")}`;
}

function decodeUint(value) {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) return null;
  try { return BigInt(value); } catch { return null; }
}

function decodeAddress(value) {
  if (typeof value !== "string" || value.length < 42) return null;
  return `0x${value.slice(-40)}`.toLowerCase();
}

function blockNumber(value) {
  const number = Number.parseInt(String(value || ""), 16);
  return Number.isSafeInteger(number) ? number : null;
}

async function rpc(url, method, params, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { accept: "application/json", "content-type": "application/json", "user-agent": "JOBEN-NETWORK/3.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const body = await response.json();
    if (!response.ok || body.error) {
      const error = new Error(body.error?.message || `RPC_HTTP_${response.status}`);
      error.code = [-32005, -32602].includes(body.error?.code) ? "RPC_RANGE_LIMIT" : "RPC_ERROR";
      throw error;
    }
    return body.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function indexerPage(baseUrl, path, params, timeoutMs) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "JOBEN-NETWORK/3.0" },
    });
    if (!response.ok) throw new Error(`INDEXER_HTTP_${response.status}`);
    const body = await response.json();
    if (!body || !Array.isArray(body.items)) throw new Error("INDEXER_MALFORMED_RESPONSE");
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function paginationCursor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value).filter(([, item]) => (
    typeof item === "string" || typeof item === "number" || typeof item === "boolean"
  ));
  return entries.length ? Object.fromEntries(entries) : null;
}

function transferFromIndexer(item) {
  const from = item.from?.hash || item.from_address_hash || item.from || null;
  const to = item.to?.hash || item.to_address_hash || item.to || null;
  const amount = item.total?.value ?? item.amount ?? item.value;
  if (!/^0x[a-f0-9]{40}$/i.test(String(from)) || !/^0x[a-f0-9]{40}$/i.test(String(to))) return null;
  if (amount === null || amount === undefined || !/^(?:\d+|0x[0-9a-f]+)$/i.test(String(amount))) return null;
  return {
    txHash: item.tx_hash || item.transaction_hash || item.transaction?.hash || null,
    blockNumber: Number(item.block_number || item.blockNumber || item.block?.number) || null,
    logIndex: Number(item.log_index || item.logIndex) || null,
    from: String(from).toLowerCase(),
    to: String(to).toLowerCase(),
    amount: String(amount).toLowerCase().startsWith("0x") ? BigInt(amount).toString() : String(amount),
  };
}

function transferIdentity(item) {
  if (item.txHash && item.logIndex !== null && item.logIndex !== undefined) {
    return `${String(item.txHash).toLowerCase()}:${item.logIndex}`;
  }
  return [
    item.blockNumber ?? "unknown",
    item.logIndex ?? "unknown",
    item.from,
    item.to,
    item.amount,
  ].join(":");
}

async function collectIndexerTransfers({
  blockscoutHost,
  tokenAddress,
  timeoutMs,
  maxPages = 200,
  budgetMs = 25000,
  cursor: initialCursor = null,
} = {}) {
  if (!blockscoutHost) return null;
  const baseUrl = `https://${blockscoutHost}`;
  const path = `/api/v2/tokens/${encodeURIComponent(tokenAddress)}/transfers`;
  const transfers = [];
  let cursor = paginationCursor(initialCursor);
  let pages = 0;
  const deadline = Date.now() + budgetMs;
  try {
    do {
      if (Date.now() >= deadline) {
        return {
          status: "PARTIAL",
          transfers: dedupeTransfers(transfers),
          pages,
          nextCursor: cursor,
          reason: "Indexer pagination time budget reached.",
        };
      }
      const body = await indexerPage(baseUrl, path, cursor || {}, timeoutMs);
      for (const item of body.items) {
        const transfer = transferFromIndexer(item);
        if (transfer) transfers.push(transfer);
      }
      cursor = paginationCursor(body.next_page_params);
      pages += 1;
      if (pages >= maxPages && cursor) {
        return {
          status: "PARTIAL",
          transfers: dedupeTransfers(transfers),
          pages,
          nextCursor: cursor,
          reason: "Indexer pagination safety limit reached.",
        };
      }
    } while (cursor);
    return { status: "COMPLETE", transfers: dedupeTransfers(transfers), pages, nextCursor: null };
  } catch (error) {
    return {
      status: "UNAVAILABLE",
      transfers: dedupeTransfers(transfers),
      pages,
      nextCursor: cursor,
      reason: error.message,
    };
  }
}

function dedupeTransfers(transfers) {
  return [...new Map(transfers.map((item) => [transferIdentity(item), item])).values()];
}

function aggregateTransferList(transfers, tokenAddress) {
  return aggregateTransfers(transfers.map((item) => ({
    transactionHash: item.txHash,
    blockNumber: item.blockNumber === null ? null : `0x${item.blockNumber.toString(16)}`,
    logIndex: item.logIndex === null ? null : `0x${item.logIndex.toString(16)}`,
    topics: [TRANSFER_TOPIC, `0x${hexWord(item.from)}`, `0x${hexWord(item.to)}`],
    data: `0x${hexWord(BigInt(item.amount).toString(16))}`,
  })), tokenAddress);
}

function mergeEvmHistory(previous, current, tokenAddress) {
  const previousTransfers = Array.isArray(previous?.transfers) ? previous.transfers : [];
  const currentTransfers = Array.isArray(current?.transfers) ? current.transfers : [];
  const transfers = [...new Map(
    [...previousTransfers, ...currentTransfers].map((item) => [transferIdentity(item), item]),
  ).values()];
  const previousEvents = Array.isArray(previous?.events) ? previous.events : [];
  const currentEvents = Array.isArray(current?.events) ? current.events : [];
  const events = [...new Map(
    [...previousEvents, ...currentEvents]
      .map((item) => [`${item.txHash || "unknown"}:${item.blockNumber || "unknown"}:${item.newOwner || ""}`, item]),
  ).values()];
  return {
    ...current,
    ...(current?.transfers ? aggregateTransferList(transfers, tokenAddress) : {}),
    ...(current?.events ? { events } : {}),
    pages: (previous?.pages || 0) + (current?.pages || 0),
  };
}

async function collectIndexerOwnerEvents({
  blockscoutHost,
  tokenAddress,
  timeoutMs,
  maxPages = 200,
  budgetMs = 25000,
  cursor: initialCursor = null,
} = {}) {
  if (!blockscoutHost) return null;
  const baseUrl = `https://${blockscoutHost}`;
  let cursor = paginationCursor(initialCursor);
  let pages = 0;
  const deadline = Date.now() + budgetMs;
  const events = [];
  try {
    do {
      if (Date.now() >= deadline) return { status: "PARTIAL", events, pages, nextCursor: cursor, reason: "Indexer pagination time budget reached." };
      const body = await indexerPage(baseUrl, `/api/v2/addresses/${encodeURIComponent(tokenAddress)}/logs`, cursor || {}, timeoutMs);
      for (const item of body.items) {
        const topics = item.topics || item.topic_hashes || [];
        const topic0 = item.topic0 || topics[0];
        if (String(topic0).toLowerCase() !== OWNERSHIP_TRANSFERRED_TOPIC) continue;
        const previousOwner = topicAddress(topics[1]);
        const newOwner = topicAddress(topics[2]);
        if (previousOwner && newOwner) {
          events.push({
            blockNumber: Number(item.block_number || item.blockNumber || item.block?.number) || null,
            txHash: item.transaction_hash || item.tx_hash || item.transaction?.hash || null,
            previousOwner,
            newOwner,
          });
        }
      }
      cursor = paginationCursor(body.next_page_params);
      pages += 1;
      if (pages >= maxPages && cursor) return { status: "PARTIAL", events, pages, nextCursor: cursor, reason: "Indexer pagination safety limit reached." };
    } while (cursor);
    return { status: "COMPLETE", events, pages, nextCursor: null };
  } catch (error) {
    return { status: "UNAVAILABLE", events, pages, nextCursor: cursor, reason: error.message };
  }
}

function topicAddress(topic) {
  return decodeAddress(topic);
}

function aggregateTransfers(logs, tokenAddress) {
  const balances = new Map();
  const transfers = [];
  for (const log of Array.isArray(logs) ? logs : []) {
    const from = topicAddress(log.topics?.[1]);
    const to = topicAddress(log.topics?.[2]);
    const amount = decodeUint(log.data);
    if (!from || !to || amount === null) continue;
    const apply = (address, delta) => balances.set(address, (balances.get(address) || 0n) + delta);
    apply(from, -amount);
    apply(to, amount);
    transfers.push({
      txHash: log.transactionHash || null,
      blockNumber: blockNumber(log.blockNumber),
      logIndex: blockNumber(log.logIndex),
      from,
      to,
      amount: amount.toString(),
    });
  }
  const top = [...balances.entries()]
    .filter(([address, balance]) => balance > 0n && !/^0x0{40}$/i.test(address) && !/^0x0{39}dead$/i.test(address))
    .sort((a, b) => b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] > a[1] ? 1 : -1)
    .slice(0, 20)
    .map(([address, balance]) => ({ address, balance: balance.toString() }));
  return { tokenAddress, transfers, topHolders: top, observedHolderCount: [...balances.values()].filter((value) => value > 0n).length };
}

async function getLogsAdaptive({ rpcUrl, address, topic0, latest, timeoutMs, maxBlocks = 1000, maxChunks = 1 }) {
  const logs = [];
  let cursor = latest;
  let chunks = 0;
  let complete = true;
  let scannedFromBlock = latest;
  let scannedToBlock = latest;
  while (cursor >= 0 && chunks < maxChunks) {
    const from = Math.max(0, cursor - maxBlocks + 1);
    const to = cursor;
    try {
      const batch = await rpc(rpcUrl, "eth_getLogs", [{
        address,
        fromBlock: `0x${from.toString(16)}`,
        toBlock: `0x${to.toString(16)}`,
        topics: [topic0],
      }], timeoutMs);
      logs.push(...(Array.isArray(batch) ? batch : []));
      scannedFromBlock = from;
      scannedToBlock = Math.max(scannedToBlock, to);
      cursor = from - 1;
      chunks += 1;
    } catch (error) {
      if (error.code !== "RPC_RANGE_LIMIT" || to === from) {
        complete = false;
        break;
      }
      maxBlocks = Math.max(1000, Math.floor(maxBlocks / 2));
    }
  }
  if (cursor >= 0) complete = false;
  return { logs, complete, fromBlock: scannedFromBlock, toBlock: scannedToBlock, chunks };
}

function boundedLogScan(options, deadlineMs) {
  return Promise.race([
    getLogsAdaptive(options),
    new Promise((resolve) => setTimeout(() => resolve({
      logs: [], complete: false, fromBlock: options.latest, toBlock: options.latest, chunks: 0, timedOut: true,
    }), deadlineMs)),
  ]);
}

async function simulateRouter({ rpcUrl, networkId, tokenAddress, pairAddress, decimals, timeoutMs = 12000 }) {
  const router = ROUTERS[networkId];
  if (!router || !/^0x[a-f0-9]{40}$/i.test(String(pairAddress || ""))) {
    return { status: "UNKNOWN", reason: "No verified router/pair mapping is available for this network." };
  }
  const tokenWord = addressArg(tokenAddress);
  const wrappedWord = addressArg(router.wrapped);
  const amount = 10n ** BigInt(Number.isInteger(decimals) && decimals >= 0 && decimals <= 36 ? decimals : 18);
  try {
    const output = await rpc(rpcUrl, "eth_call", [{
      to: router.address,
      data: callData("d06ca61f", [hexWord(amount.toString(16)), hexWord(64), hexWord(2), tokenWord, wrappedWord]),
    }, "latest"], timeoutMs);
    const words = String(output).replace(/^0x/, "").match(/.{64}/g) || [];
    const quoted = decodeUint(`0x${words.at(-1)}`);
    if (quoted === null || quoted === 0n) return { status: "REVERT", reason: "Router returned no executable output.", router: router.address };
    return { status: "PASS", router: router.address, wrappedNative: router.wrapped, amountIn: amount.toString(), quotedOutput: quoted.toString(), quoteMethod: "UniswapV2 getAmountsOut eth_call" };
  } catch (error) {
    return { status: "REVERT", reason: error.message, router: router.address, errorCode: error.code || "RPC_ERROR" };
  }
}

async function collectEvmEvidence({
  network,
  tokenAddress,
  pairAddress,
  decimals,
  timeoutMs = 12000,
  latestBlockTimeoutMs = Math.min(timeoutMs, 5000),
  historyTimeoutMs = Math.min(timeoutMs, 4000),
  historyBudgetMs = 8000,
  historyFallbackBudgetMs = 4000,
  indexerMaxPages = 200,
  transferCursor = null,
  ownerCursor = null,
} = {}) {
  const startedAtMs = Date.now();
  const startedAt = new Date().toISOString();
  if (!network?.evm || !network.rpcUrl) {
    return {
      status: "UNAVAILABLE",
      retrievedAt: startedAt,
      latencyMs: Date.now() - startedAtMs,
      limitations: ["On-chain EVM evidence is unavailable for this network."],
      exitability: { status: "UNKNOWN", reason: "Network has no EVM RPC." },
      holderHistory: { status: "UNKNOWN", reason: "Network has no EVM RPC." },
    };
  }
  try {
    const latestHex = await rpc(network.rpcUrl, "eth_blockNumber", [], latestBlockTimeoutMs);
    const latest = blockNumber(latestHex);
    if (latest === null) throw new Error("RPC returned an invalid latest block.");
    const [exitability, indexerTransfers, indexerOwners] = await Promise.all([
      simulateRouter({ rpcUrl: network.rpcUrl, networkId: network.id, tokenAddress, pairAddress, decimals, timeoutMs: Math.min(timeoutMs, 6000) }),
      collectIndexerTransfers({ blockscoutHost: network.blockscoutHost, tokenAddress, timeoutMs: historyTimeoutMs, maxPages: indexerMaxPages, budgetMs: historyBudgetMs, cursor: transferCursor }),
      collectIndexerOwnerEvents({ blockscoutHost: network.blockscoutHost, tokenAddress, timeoutMs: historyTimeoutMs, maxPages: indexerMaxPages, budgetMs: historyBudgetMs, cursor: ownerCursor }),
    ]);
    const fallbackOptions = {
      rpcUrl: network.rpcUrl,
      address: tokenAddress,
      latest,
      timeoutMs: Math.min(timeoutMs, 4000),
    };
    const transferScan = indexerTransfers?.status === "COMPLETE" || indexerTransfers?.status === "PARTIAL"
      ? { ...indexerTransfers, fromBlock: null, toBlock: latest }
      : null;
    const ownerScan = indexerOwners?.status === "COMPLETE" || indexerOwners?.status === "PARTIAL"
      ? { ...indexerOwners, fromBlock: null, toBlock: latest }
      : null;
    const [fallbackTransfers, fallbackOwners] = await Promise.all([
      transferScan || boundedLogScan({ ...fallbackOptions, topic0: TRANSFER_TOPIC }, historyFallbackBudgetMs),
      ownerScan || boundedLogScan({ ...fallbackOptions, topic0: OWNERSHIP_TRANSFERRED_TOPIC, maxBlocks: 1000, maxChunks: 1 }, historyFallbackBudgetMs),
    ]);
    const resolvedTransferScan = transferScan || fallbackTransfers;
    const resolvedOwnerScan = ownerScan || fallbackOwners;
    const history = resolvedTransferScan.transfers
      ? aggregateTransferList(resolvedTransferScan.transfers, tokenAddress)
      : aggregateTransfers(resolvedTransferScan.logs, tokenAddress);
    const ownerEvents = resolvedOwnerScan.events || resolvedOwnerScan.logs.map((log) => ({
      blockNumber: blockNumber(log.blockNumber),
      txHash: log.transactionHash || null,
      previousOwner: topicAddress(log.topics?.[1]),
      newOwner: topicAddress(log.topics?.[2]),
    }));
    return {
      status: "VALID",
      retrievedAt: startedAt,
      latencyMs: Date.now() - startedAtMs,
      latestBlock: latest,
      exitability,
      holderHistory: { status: resolvedTransferScan.status || (resolvedTransferScan.complete ? "COMPLETE" : "PARTIAL"), ...history, scannedFromBlock: resolvedTransferScan.fromBlock, scannedToBlock: resolvedTransferScan.toBlock, chunks: resolvedTransferScan.chunks, pages: resolvedTransferScan.pages, nextCursor: resolvedTransferScan.nextCursor || null },
      ownerHistory: { status: resolvedOwnerScan.status || (resolvedOwnerScan.complete ? "COMPLETE" : "PARTIAL"), events: ownerEvents, scannedFromBlock: resolvedOwnerScan.fromBlock, scannedToBlock: resolvedOwnerScan.toBlock, chunks: resolvedOwnerScan.chunks, pages: resolvedOwnerScan.pages, nextCursor: resolvedOwnerScan.nextCursor || null },
      limitations: [
        ...(resolvedTransferScan.status === "COMPLETE" || resolvedTransferScan.complete ? [] : ["Transfer event history is partial or unavailable; the indexer/RPC did not provide a complete cursor traversal."]),
        ...(resolvedOwnerScan.status === "COMPLETE" || resolvedOwnerScan.complete ? [] : ["Ownership event history is partial or unavailable; the indexer/RPC did not provide a complete cursor traversal."]),
        "Router output is a read-only quote; it does not prove a wallet allowance, balance, slippage tolerance, or successful mined transaction.",
      ],
    };
  } catch (error) {
    return { status: "UNAVAILABLE", retrievedAt: startedAt, latencyMs: Date.now() - startedAtMs, errorCode: error.code || "RPC_ERROR", limitations: ["On-chain evidence request failed; no synthetic result was substituted."], exitability: { status: "UNKNOWN", reason: error.message }, holderHistory: { status: "UNKNOWN", reason: error.message }, ownerHistory: { status: "UNKNOWN", reason: error.message } };
  }
}

module.exports = {
  collectEvmEvidence,
  collectIndexerTransfers,
  collectIndexerOwnerEvents,
  mergeEvmHistory,
  transferFromIndexer,
  TRANSFER_TOPIC,
  OWNERSHIP_TRANSFERRED_TOPIC,
};