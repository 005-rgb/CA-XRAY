---
name: Native address checksums
description: Protocol-specific address validation rules for native chain adapters.
---

Native address validation must use each protocol's own encoding rules: TON friendly addresses include CRC16, Tron uses Bitcoin-style Base58Check, XRPL uses its Ripple Base58 alphabet plus checksum, and Cosmos/Cardano Bech32 addresses require checksum and decoded payload-length checks.

**Why:** Generic alphabet/length checks accepted malformed addresses and could send provider requests for the wrong chain target.

**How to apply:** When adding or changing a native adapter, validate the complete address encoding before any network call and keep unsupported address families fail-closed.