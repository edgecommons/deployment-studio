# Future design — the prescriptive dataflow and capability model

**Status:** extracted from the product's core narrative on 2026-07-22 (step 2.4 of `../PLAN.md`).
Not scheduled. The product ships only the *derived, read-only* topology view; this note preserves
the prescriptive branch so it can be revisited deliberately instead of leaking back in through
mocks and examples — which is how it kept re-entering before the extraction.

## What the prescriptive model was

An authoring surface where dataflows are first-class edited objects:

- **Dataflow edges** with producer, consumer, message class, topic expression, transport pattern
  (local pub/sub, durable stream, request/reply), delivery guarantee, backpressure policy, and
  retry policy.
- **Runtime capability claims** per component (local pub/sub, durable buffer, health check),
  validated against the target standard and rendered into per-target bindings (Greengrass IPC
  topic policy, artifact paths and storage quotas, lifecycle health commands).
- Compatibility validation at authoring time: producer/consumer message-contract matching,
  unsupported-transport findings, missing-capability findings.

The old definition-map mock realized this literally: an "Add dataflow" editor with
producer/consumer/class/topic/backpressure/retry selectors.

## Why it was extracted

1. **No substrate.** The knobs do not map to any shipped runtime surface — there is no
   per-edge retry/backpressure/delivery contract in the core libraries, and no machine-readable
   message-contract metadata to validate producer/consumer compatibility against. (REVIEW W3
   called this the least-grounded surface in the deck.)
2. **No write path.** A dataflow edge is not an object in the shipped model. Prescriptively,
   editing an edge writes *two* components' config leaves — a cross-component, cross-owner
   transactional edit with no ownership story.
3. **Invented grammar.** Authored topic expressions conflict with the UNS contract
   (`ecv1/{device}/{component}/{instance}/{class}[/channel]`), where topics largely *derive from*
   identity and class rather than being authored free-form.
4. It is a different product — a contract registry and type system for messaging — riding inside a
   deployment compiler.

## What it would unlock (the reason to ever revisit)

- **Derived least-privilege ACLs**: generate Greengrass `accessControl` and broker ACLs from the
  declared flow graph instead of hand-maintaining wildcard policies. This is the strongest
  justification, and it is real.
- Authoring-time compatibility validation (schema/contract mismatches caught before render).
- Capability-driven rendering (declared needs select recipe/lifecycle/storage bindings).

## Preconditions before revisiting

1. Registry metadata: components declare the message classes they produce and consume
   (the RM-005/describe direction), machine-readably.
2. A core `describe` surface (or equivalent) so declared contracts can be verified against
   running components.
3. A settled derivation rule from flow declarations to UNS topics — authored expressions stay out.
4. An ownership/transaction story for edits that span two components' config leaves.

## What the product keeps meanwhile

The **Topology** view: a read-only graph *derived from effective configs* (adapter publish
classes, processor routes, replicator inputs, bridge subscriptions), scoped to the fleet
selection, whose job is explanation and verification — dangling consumers, class/topic
mismatches, missing capability bindings — with deep links into the config surfaces that own the
writes.
