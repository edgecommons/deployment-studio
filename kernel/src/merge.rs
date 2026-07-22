//! The shipped hierarchical-config merge contract: objects merge recursively by key, arrays and
//! scalars replace wholesale, later layers win. Key positions are stable — an overridden key
//! keeps its first-seen position, a new key appends (serde_json `preserve_order`).

use serde_json::{Map, Value};

pub fn deep_merge(base: &mut Map<String, Value>, overlay: &Map<String, Value>) {
    for (key, incoming) in overlay {
        match (base.get_mut(key), incoming) {
            (Some(Value::Object(existing)), Value::Object(over)) => deep_merge(existing, over),
            _ => {
                base.insert(key.clone(), incoming.clone());
            }
        }
    }
}
