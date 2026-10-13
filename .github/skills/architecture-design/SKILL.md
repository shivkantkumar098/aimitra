---
name: architecture-design
description: "Assess component boundaries, API/data flow, compatibility, and technical decisions for a change. Use before design and implementation."
---
# Architecture Design

1. Read the relevant architecture documentation and inspect current call paths.
2. Identify the components and boundaries affected by the accepted request.
3. Describe only necessary changes to data flow, API contracts, state ownership, or persistence.
4. Preserve current layering and compatibility unless a requirement explicitly needs a change.
5. Consider privacy, secrets, authorization, validation, error propagation, and failure modes where relevant.
6. Return decisions, affected components, alternatives when consequential, and risks. Do not edit files.
