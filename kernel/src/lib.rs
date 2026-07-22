//! Deployment Studio kernel (slice 1): the DeploymentDefinition model, the semantic validator,
//! and the HOST renderer, with an oracle diff engine that proves renders against the
//! hand-maintained Dallas harness. See `../PLAN.md` step 3 and `../schema/DEFINITION.md`.

pub mod context;
pub mod merge;
pub mod model;
pub mod oracle;
pub mod render;
pub mod validate;
