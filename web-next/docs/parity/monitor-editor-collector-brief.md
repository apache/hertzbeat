# Monitor Editor Collector Brief

Local design judgment for the monitor edit collector regression.

- Hierarchy: an empty collector value and the built-in `main-default-collector` both mean system default dispatch; selectable pinned collectors should only show real user/edge collector names.
- Density: keep the existing compact form and payload preview; do not add explanatory banners for a parity label fix.
- Anti-AI-slop: do not render default dispatch as `None`, and do not fake save success while backend collection probe work is still blocking.
- Operator workflow clarity: `OK` saves configuration and returns to the monitor list; `Detect` remains the explicit synchronous probe action.
- Context visibility: the collector select, payload preview, save payload, and backend update path are covered by contracts so the operator sees the same default-dispatch meaning as Angular.

## 2026-05-13 Monitor Type Picker Boundary

- Hierarchy: the default monitor center `New monitor` action must open the old Angular-style grouped monitor type picker instead of inferring a type from the currently selected row; direct `/monitors/new?app=...` is reserved for an explicit app filter or picker selection.
- Density: use a compact searchable modal with grouped type rows, not a permanent second-level rail that makes the monitor center or YML definition workspace feel longer than the task.
- Anti-AI-slop: do not silently default to `mysql`, `website`, or the first row when the operator asked to create a monitor from the general center.
- Operator workflow clarity: selection is a deliberate first step; after the operator chooses a type, navigate to the normal monitor form with that `app`.
- Context visibility: the picker keeps category labels visible, excludes `__system__`, and preserves return/filter context only after an explicit type choice.
