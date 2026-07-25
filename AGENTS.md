--------------------------------------------------
Runtime Notes
--------------------------------------------------

## Code Quality

When presenting an implementation plan, make it a complete plan for immediate execution. List the required work in dependency order and include implementation, migration, validation, tests, and cleanup in the same plan. Do not divide required work into "phase one", "phase two", "later phase", or similar deferred stages; do not postpone necessary correctness, consistency, or durability work as optional follow-up.

Avoid low-value parameter explosion. If a method already receives an object that owns the required context, pass that object to helper methods instead of unpacking it into multiple sibling parameters and forwarding them. Keep validation, normalization, and DTO conversion in one boundary method, then reuse the converted object for derived values such as command IDs.

Avoid low-value abstraction and wrapper types. Before adding an interface, marker class, wrapper DTO, builder-only carrier, or hierarchy, verify that it owns behavior, enforces an invariant, hides meaningful complexity, or is required by multiple independent implementations. If the wrapper only groups one or two existing values and adds no behavior or invariant, use direct fields such as `entryType` plus the existing payload object instead. Do not introduce polymorphism to model a simple enum branch.

Avoid unused parallel extension chains. Do not keep constructor parameters, bean injections, registrars, or adapter paths solely as future extension hooks when the production code has a single real source of implementations. If an alternate registration path has no current production user and does not enforce a required invariant, delete it and let future work add the extension point when the second implementation actually exists.

Avoid low-value helper methods and normalizers. Do not add or retain private helpers that only select between two already-owned fields, directly forward a property such as a tool name, shallow-copy a map, or rename a one-line null/default behavior. Inline these operations at the call site, or move real validation/normalization to the actual boundary that owns the input. A helper is only justified when it enforces a concrete invariant, performs non-trivial validation, or is reused by independent call paths with the same boundary semantics.

Treat every string normalization as a design decision, not a default defensive reflex. Before adding or retaining any string normalization, verify the upstream format can legitimately vary and that normalization is required for a concrete comparison, lookup, persistence key, protocol boundary, or security invariant. Add a short comment immediately above the normalization explaining the upstream variation and why this boundary owns the normalization. If that reason is not concrete, remove the normalization instead of documenting boilerplate.

Treat `Objects.requireNonNull`, explicit null checks, and fallback/default object creation as design decisions, not boilerplate. Before adding them, inspect the full call chain to verify whether the value can actually be null and decide whether the correct behavior is fail-fast or fallback. Only keep this code when null is possible or when a boundary must fail fast for a concrete reason. If it is necessary, add a short comment immediately above the code explaining the upstream null path or boundary invariant, and why fail-fast or fallback belongs there.

Do not add private or package-local `hasText` helper wrappers in Java code. Use existing framework/JDK methods directly, such as `StringUtils.hasText(...)`, or inline the check when no framework utility is available. Avoid one-line wrappers that only rename a standard blank/text check.

Treat `sanitizeAndLimit` as a boundary decision, not boilerplate. Use it only for untrusted or free-form text that crosses into prompts, persistence, events, logs, or external results where secret redaction or size bounding is required. Do not apply it to protocol identifiers, enum-like statuses, tool names, call IDs, hashes, or values already normalized by an upstream boundary unless there is a concrete downstream size or secrecy risk. For every retained `sanitizeAndLimit` call, add a short comment immediately above the assigned variable explaining the upstream source and the boundary that requires redaction or bounding.

## Node/npm

In the Codex sandbox, node, npm, and nvm may not resolve from PATH even when PATH contains C:\\Program Files\\nodejs.

Prefer explicit paths:

- & "$env:NVM_SYMLINK\\node.exe" --version
- & "$env:NVM_SYMLINK\\npm.cmd" --version
- & "$env:NVM_SYMLINK\\npm.cmd" test
- & "$env:NVM_SYMLINK\\npm.cmd" run build

If full-path Node/npm commands are blocked by sandbox permissions, rerun them with escalated permissions instead of falling back to plain node or npm.

## Java/Maven

For HertzBeat Java builds, use IntelliJ IDEA bundled Maven.

Maven path:

C:\\Program Files\\JetBrains\\IntelliJ IDEA 2024.2.4\\plugins\\maven\\lib\\maven3\\bin\\mvn.cmd

Set JAVA_HOME:

C:\\Users\\CYY\\.jdks\\graalvm-jdk-25

Example:

$env:JAVA_HOME='C:\\Users\\CYY\\.jdks\\graalvm-jdk-25';
$env:Path="$env:JAVA_HOME\\bin;$env:Path";
& 'C:\\Program Files\\JetBrains\\IntelliJ IDEA 2024.2.4\\plugins\\maven\\lib\\maven3\\bin\\mvn.cmd' -pl hertzbeat-ai-gateway -am -DskipTests compile
