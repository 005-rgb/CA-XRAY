---
name: Replit configuration validation
description: Replit runtime configuration files require platform validation before replacement.
---

When changing `.replit`, write the proposed full file to a temporary workspace path
and pass it through the platform's validation/replacement callback instead of editing
the file directly.

**Why:** Direct edits are blocked to protect workflow, port, and runtime configuration
from malformed TOML or unsupported settings.

**How to apply:** Use this flow for Node/runtime modules, workflow metadata, and port
changes; ordinary source files can still use the normal patch tool.