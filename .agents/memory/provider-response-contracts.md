---
name: Provider response contracts
description: Non-obvious response-shape behavior for the public market/security providers.
---

Provider response shapes must be classified before normalization. DexScreener can return HTTP 200 with `pairs: null` for a valid address without a supported market pair; this is a no-pair/data-unavailable state, not a malformed response. GoPlus response codes may be numeric or string representations. Holder concentration values from different providers may use different scopes (for example, wallet-only versus contract/LP-inclusive) and must remain separate.

**Why:** Converting a valid no-result response into a malformed-provider error obscures the actual limitation and makes the forensic report less precise; merging differently scoped holder sets creates false conflicts or silently loses usable evidence.

**How to apply:** Keep provider-specific shape handling at the boundary, preserve explicit not-found/no-pair/error states, only normalize fields after the response shape is known to be usable, and label provider-specific holder scopes before merging.