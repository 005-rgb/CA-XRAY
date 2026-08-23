---
name: Chain target validation
description: Address syntax alone cannot establish that a contract belongs to the selected EVM network.
---

An EVM address must be checked against the selected chain's deployed bytecode before its provider evidence is treated as a valid scan target.

**Why:** The same address format is valid across EVM networks, so syntax-only validation can present an empty or wrong-chain target as a real contract.

**How to apply:** Keep network mismatch and provider-data unavailability distinct; report the selected network and ask the user to check the network/address when no bytecode is found.