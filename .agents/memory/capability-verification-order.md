---
name: Capability verification order
description: The non-obvious ordering rule for combining bytecode-security signals with verified ABI and ownership evidence.
---

Security capability positives must be merged from active providers before they are verified against independent block-explorer ABI and RPC evidence. A verified ABI confirms matching functions, downgrades unsupported positives to `UNVERIFIED_SIGNAL`, and leaves missing provider evidence `NOT_CHECKED`; proxy-admin evidence remains a separate active-control signal.

**Why:** Provider-order merging can otherwise turn a GoPlus positive and an ABI absence into a silent conflict or an incorrectly trusted capability. Ownership renouncement also does not remove proxy-admin risk.

**How to apply:** Keep DexScreener market-only, keep capability detection and ABI/RPC adapters independent, run the verification layer after normalized evidence merge, and never convert unavailable provider results into safe negatives.