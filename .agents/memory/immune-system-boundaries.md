---
name: Immune system boundaries
description: Tenant-safe service and public verification boundaries for the Arbitrum intent firewall.
---

Admission must pass through the immune-system service before reaching the registry
or gate, and public passport responses must strip workspace and internal linkage.

**Why:** The HTTP route can otherwise bypass tenant isolation or call a lower-level
gate that has no workspace context, while verification output can leak private
decision ownership metadata.

**How to apply:** Route reads and admission through the service with the authenticated
workspace scope; keep registry state and public verification serialization separate.