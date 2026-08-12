---
name: Provider response contracts
description: Non-obvious response-shape behavior for the public market/security providers.
---

Provider response shapes must be classified before normalization. DexScreener can return HTTP 200 with `pairs: null` for a valid address without a supported market pair; this is a no-pair/data-unavailable state, not a malformed response. GoPlus response codes may be numeric or string representations.

**Why:** Converting a valid no-result response into a malformed-provider error obscures the actual limitation and makes the forensic report less precise.

**How to apply:** Keep provider-specific shape handling at the boundary, preserve explicit not-found/no-pair/error states, and only normalize fields after the response shape is known to be usable.