# Legacy Frontend Full Parity Brief

Local-only parity note for the post-M9 frontend parity correction.

## 2026-05-13 M10 Legacy Frontend Functional Parity Boundary

- Hierarchy: route ownership is only the first gate. Release readiness now requires old Angular operator functions to be proven in the Next frontend with the same navigation, read, mutation, bulk-action, SSE/live, and context handoff behavior.
- Density: keep the audit as a compact operator matrix. Do not add marketing copy, explanatory hero sections, duplicate navigation groups, or decorative placeholder cards while closing missing legacy functions.
- Anti-AI-slop: a route cannot be counted complete because it renders a page, redirect, static shell, fixture row, or placeholder. Candidate pages must prove real API read/mutation behavior and visible operator controls against the old Angular capability.
- Operator workflow clarity: each legacy workflow needs an explicit old source, Next destination, expected controls, minimum browser/API smoke, and release status. `hold` and `placeholder` routes remain blockers until either implemented or deliberately cut by product decision.
- Context visibility: route path, query parameters, selected ids, entity/monitor return context, time range, SSE/live source, mutation endpoint, and success/error feedback must stay visible in tests, data attributes, or browser smoke evidence.

## Initial Audit Findings

- Route-level coverage is broad but not sufficient: Angular core route families are present in Next or aliases, yet `web-next/lib/nav.ts` still marks 4 primary routes as `hold` and 3 primary routes as `placeholder`.
- Current `hold` primary routes: `/log/manage`, `/trace/manage`, `/monitors/[monitorId]`, `/passport/login`.
- Current `placeholder` primary routes: `/incidents`, `/actions`, `/explorer`.
- Angular placeholders for incidents/actions/topology/explorer were intentionally shell-only, but Next still must not count them as complete product functions unless a later product decision says the shell is enough.
- The old Angular shell includes server-backed alert/manager SSE notification behavior, server mute config, AI chat modal, about modal with "do not show again", settings drawer, fullscreen, locale, lock, and account actions. The Next shell has analogous chrome, but some behavior is downgraded to polling, local-only mute, route query handoff, or external documentation link and needs explicit parity decisions.
- Monitor detail remains a known high-risk parity area: Angular has realtime/history/favorite tab rhythm, metric row drilldowns, chart/table switching, quick time presets, refresh controls, and favorite metric behavior. The Next route is still `hold`.
- Monitor management, alert center, alert rules, notification rules/templates/receivers, public status management, collectors, templates, plugins, labels, system config, message server, object store, token management, and entity workbench all need action-level parity evidence, not just a route test.

## M10 Gate Shape

1. Build a legacy function inventory from Angular routes/components/services and Next routes/controllers/surfaces.
2. Mark each old workflow as `covered`, `needs-browser-proof`, `hold`, `placeholder`, or `missing`.
3. Write the failing parity contract before changing product code.
4. Close one missing or hold slice per pass with the smallest implementation and a focused browser/API smoke.
5. Only mark M10 complete when no old Angular operator workflow is untriaged, no primary route remains `hold` without product approval, and no placeholder is counted as feature-complete.

## 2026-05-13 Contract Baseline

- `web-next/lib/legacy-frontend-parity.test.ts` is the first M10 contract.
- `buildLegacyFrontendParityAudit()` records the route catalog count, primary hold routes, primary placeholder routes, and legacy operator areas.
- `validateLegacyFrontendParityGate()` intentionally returns an invalid gate while hold/placeholder routes and unproven legacy areas remain.
- This contract is a release blocker inventory, not a claim that the listed areas are implemented.

## 2026-05-13 YML Definition Workspace Plan

- Hierarchy: `/setting/define` must be treated as the old monitor-template YML definition workspace, not as alert-rule authoring. The primary old sources are `web-app/src/app/routes/setting/define/define.component.ts`, `define.component.html`, `web-app/src/app/service/app-define.service.ts`, and backend `/api/apps` plus `/api/config/template/{app}` contracts.
- Density: preserve the old operator rhythm: left categorized monitor-template tree, compact toolbar, single YAML editor, diff editor only while editing an existing template, and no extra datasource/status/preview panels unless a later product decision asks for them.
- Anti-AI-slop: do not synthesize a monitor-template editor from alert definitions, datasource status, PromQL previews, or fixture rows. A passing route shell is not enough; the contract must prove monitor-template YML load/save/delete/hide behavior against the old endpoints.
- Operator workflow clarity: first red contract should prove the current Next implementation is wrong by expecting `/apps/hierarchy`, `/apps/{app}/define/yml`, `/apps/define/yml` POST/PUT, `/apps/{app}/define/yml` DELETE, and `/config/template/{app}` hide/show ownership, with `prometheus` and `__system__` hidden from the menu.
- Context visibility: keep selected `app` query state, app label, category, hide state, read-only vs edit mode, original YAML, edited YAML, save-apply success/error, delete success/error, and startup config reload evidence visible in tests or browser smoke.
- Planned first slice: replace the current alert-definition backing model for `/setting/define` with a monitor-template YML backing model and surface contract. Do not broaden into monitor detail, OTLP, alert-rule authoring, or generic settings parity until this slice validates green.

## 2026-05-13 YML Definition Workspace Slice Result

- Completed first M10 YML slice: `/setting/define` now uses the old monitor-template YML API contract instead of alert-definition APIs.
- Covered behavior: `/apps/hierarchy` category menu with `prometheus` and `__system__` filtering, `/apps/{app}/define/yml` selected YAML loading, `/apps/define/yml` POST/PUT save/apply ownership, `/apps/{app}/define/yml` delete ownership, `/config/template/{app}` hide/show ownership, selected `app` query cache key, `app-*.yml` label, and a single YAML editor without alert preview or datasource panels.
- Remaining risk: this slice proves the backing contract and visible shell, but it does not yet prove full live mutation success against every template storage backend or old Angular diff-editor parity during complex edits. Keep M10 open for the next old-frontend workflow gap.

## 2026-05-13 YML Existing-Template Diff Edit Plan

- Hierarchy: old Angular switches existing templates into `nzEditorMode="diff"` with `nzOriginalText=originalCode`; Next must expose the same operator boundary as original YAML versus edited YAML when `selectedApp` is present and editing is active.
- Density: keep the edit surface compact. The old workflow is a two-pane code comparison inside the same template workspace, not a new review page, modal, preview panel, or explanatory guide.
- Anti-AI-slop: do not fake diff parity by only toggling read-only state on one editor. The contract must prove both original and current YAML are visible with stable data markers so browser smoke can distinguish rollback context from the editable buffer.
- Operator workflow clarity: Cancel must still reset the current editor to `originalYaml`, Save must apply the edited buffer, and the monitor-template app label/file label must remain visible while the two YAML panes are shown.
- Context visibility: expose `monitor-template-yaml-original`, `monitor-template-yaml`, and a `monitor-template-diff` shell only for existing-template edit mode; new-template drafts continue to use the normal single editor because old Angular does not show diff mode for `currentApp == null`.

## 2026-05-13 YML Save Guard Plan

- Hierarchy: old Angular gates `define.save-apply` behind `!loading && code != originalCode`; Next must preserve that mutation boundary instead of treating edit mode alone as permission to save.
- Density: unchanged edit mode should show Cancel, Delete, file context, and the diff panes, but should not spend toolbar space on a no-op Save action.
- Anti-AI-slop: do not simulate mutation readiness by showing a Save button that cannot produce a real changed YAML payload. The UI contract must compare `editorValue` and `originalYaml`.
- Operator workflow clarity: Save appears only after the current buffer differs from original YAML; Cancel remains available to reset the current buffer; Delete/hide keep their existing app-level ownership.
- Context visibility: expose the save guard through component tests and browser smoke by verifying unchanged existing-template edit mode has no `保存并应用` action while changed buffers still expose it.

## 2026-05-13 YML Mutation Confirmation Plan

- Hierarchy: old Angular uses `modal.confirm` for both `onSaveAndApply()` and `onDeleteDefineYml()` before the YML mutation runs; Next must restore that safety boundary for monitor-template save/apply and delete.
- Density: confirmation should reuse the compact shared cold confirm dialog, not add inline warnings, extra cards, or a multi-step wizard to the dense YML workspace.
- Anti-AI-slop: do not call `onSave` or `onDelete` directly from toolbar buttons and then merely show a message. The contract must prove the first click opens confirmation, and only the confirm action invokes the mutation handler.
- Operator workflow clarity: Save confirmation uses the old `define.save-apply.confirm` copy; Delete confirmation includes the selected app label like old `define.delete.confirm`; both keep OK/Cancel labels visible.
- Context visibility: expose `data-setting-define-save-confirm` and `data-setting-define-delete-confirm` wrappers so browser smoke can verify closed/open dialog state without relying on copy alone.

## 2026-05-13 YML Template Visibility Confirmation Plan

- Hierarchy: old Angular renders each template visibility action inside the monitor-template tree prefix and gates it with `nz-popconfirm`; Next must keep hide/show as a per-template menu action, not a toolbar-level batch setting or direct mutation.
- Density: reuse the same compact cold confirmation layer already used for save/delete so the dense template list does not gain extra warning rows, helper cards, or duplicated state panels.
- Anti-AI-slop: do not treat a hide/show icon click as proof of parity if it immediately calls `/config/template/{app}`. The contract must prove the first click opens confirmation and the API callback is invoked only from the confirm action.
- Operator workflow clarity: hidden templates use the old `define.hide-true.confirm` copy before being displayed; visible templates use `define.hide-false.confirm` before being hidden. Labels remain `显示` / `隐藏` in the row action.
- Context visibility: expose a single `data-setting-define-template-visibility-confirm` state wrapper plus selected template app/action data so browser smoke can distinguish closed/open confirmation and verify the target app without mutating the wrong template.

## 2026-05-13 YML Edit Toolbar State Plan

- Hierarchy: old Angular renders the existing-template edit action only when `currentApp != null && !isEditing`; once the operator enters edit mode the toolbar should switch to rollback/mutation actions instead of keeping a second edit affordance.
- Density: edit mode should keep the toolbar compact with Cancel, conditional Save, Delete, file context, and theme toggle. Leaving Edit visible beside Cancel adds a duplicate no-op control to the dense YML workspace.
- Anti-AI-slop: do not count the diff editor as old-frontend parity if the surrounding command row still exposes controls the old workflow intentionally hid. The contract must prove edit mode suppresses the Edit button, not just that diff panes render.
- Operator workflow clarity: entering edit mode should make the next safe choices obvious: Cancel rolls back to original YAML, Save appears only for changed YAML, Delete remains app-scoped, and Edit is not actionable until edit mode exits.
- Context visibility: component and browser smoke should verify the existing-template edit state by checking the diff shell, Cancel action, and absence of the Edit action while `selectedApp` remains visible.

## 2026-05-13 YML Empty Save Guard Plan

- Hierarchy: old Angular checks `code == undefined || code === '' || code == null` inside `onSaveAndApply()` before opening `modal.confirm`; Next must keep the empty-template warning in front of the save confirmation and API mutation.
- Density: the guard should reuse the existing compact feedback line in the YML editor shell instead of adding a new validation panel, wizard, or persistent warning card.
- Anti-AI-slop: do not treat the save confirmation as sufficient safety for an empty YAML buffer. The contract must prove an empty changed buffer does not open the confirm dialog and does not call the save handler.
- Operator workflow clarity: an empty buffer still counts as changed, so the Save action can be visible, but clicking it must produce the old `define.save-apply.no-code` warning and leave the operator in edit/diff context.
- Context visibility: expose the closed save-confirm wrapper, no-code warning copy, selected app/file label, and unchanged diff shell in component and browser smoke so the validation path is distinguishable from save/apply confirmation.

## 2026-05-13 YML Save Apply Feedback Plan

- Hierarchy: old Angular `saveAndApply()` treats a successful YML save as an applied monitor-template change, reloads menu/template context, triggers startup config reload, and shows `common.notify.apply-success`; Next must preserve that operator meaning instead of downgrading it to a generic definition-saved message.
- Density: keep success feedback in the existing compact editor message line. Do not add a second notification rail, status card, or release-style freshness chrome to the YML workspace.
- Anti-AI-slop: do not claim save/apply parity if the visible feedback says only "definition saved" while the action label, confirmation copy, and old workflow all mean "apply". The contract must bind the save success path to `common.notify.apply-success`.
- Operator workflow clarity: after a successful confirmed save, editing exits, the cache reloads, original YAML catches up to the saved buffer, and the visible feedback reads as apply success; failure still uses the existing save failure path.
- Context visibility: page contract and browser smoke should distinguish save/apply success feedback from hide/show apply feedback by proving the `saveTemplateDefine` success branch itself sets `common.notify.apply-success`.

## 2026-05-13 YML New Draft Toolbar Plan

- Hierarchy: old Angular shows the `define.new` entry only from an existing selected template and shows Cancel only for `isEditing && currentApp != null`; once the operator is already in a new-template draft, the command row should not keep duplicate New or existing-template rollback actions.
- Density: the new draft command row stays sparse: Save appears only when the draft has changed, while app-scoped file, Edit, Cancel, and Delete controls stay out of the draft context.
- Anti-AI-slop: do not count the new-template workspace as old-frontend parity if it exposes generic edit-mode controls that the old monitor-template YML workflow intentionally hid. The contract must distinguish a new draft from an existing-template edit.
- Operator workflow clarity: a new draft is committed by Save/Apply or abandoned by selecting an existing template from the menu; Cancel remains the rollback action for existing-template diff edits only.
- Context visibility: component and browser smoke should prove `selectedApp=null` with `isEditing=true` renders the normal single `monitor-template-yaml` editor, no diff shell, no monitor file link, no duplicate New, no Cancel, and no Delete.

## 2026-05-13 YML New Draft Placeholder/Dirty-State Plan

- Hierarchy: old Angular seeds new monitor-template drafts from the localized `define.new.code` help comment, then appends five blank lines to the editable buffer while keeping `originalCode` as the bare help comment. Next must not replace that with a synthesized `app: custom` skeleton.
- Density: keep the editor as the only place where the draft guidance appears. Do not add a guide card, example panel, or generated boilerplate that could be mistaken for a valid template.
- Anti-AI-slop: do not fabricate a YML template structure just because the editor is empty. The old workflow asks the operator to write real monitor-template YML and links the extension-point docs; fake fields like `metrics: availability` are worse than a blank draft.
- Operator workflow clarity: because the editable buffer intentionally differs from `originalYaml`, Save/Apply is visible immediately for a new draft, matching old `code != originalCode`; empty-save protection and confirmation still apply before mutation.
- Context visibility: contracts and browser smoke should prove the draft contains the old localized help comment, not the generated skeleton, and that `selectedApp=null` new mode exposes Save while keeping app-scoped controls hidden.

## 2026-05-13 YML Mutation Startup Reload Plan

- Hierarchy: old Angular calls `startUpSvc.loadConfigResourceViaHttp()` after successful save/apply, delete, and template hide/show mutations; Next must preserve the same post-mutation startup context refresh instead of only updating the local editor cache.
- Density: keep this as invisible runtime behavior. Do not add a reload button, status rail, or explanatory copy to the compact YML workspace.
- Anti-AI-slop: do not treat the local `/setting/define` reloadVersion as full parity if the wider app startup/menu context never re-reads system locale and monitor-template hierarchy after a YML mutation.
- Operator workflow clarity: after each successful mutation, the app should refresh startup context from `/config/system` and `/apps/hierarchy?lang=...` so monitor-template visibility and menu availability converge with the backend without requiring a browser refresh.
- Context visibility: controller/page contracts should prove the reload helper owns `/config/system` plus `/apps/hierarchy`, and browser smoke should intercept a mutation and observe the startup reload requests while preventing real template writes.

## 2026-05-13 YML New Draft Save Continuation Plan

- Hierarchy: old Angular `saveAndApply()` only reloads existing-template content when `currentApp != null`; for a new YML draft it keeps `currentApp == null`, leaves the edited code buffer in place, and does not promote `originalCode` to the saved buffer.
- Density: keep the new draft in the same editor without introducing a completion panel, redirect, wizard, or explanatory success state. The operator can keep refining the draft or select the newly-added template from the menu after menu reload.
- Anti-AI-slop: do not freeze the new-template editor just because the save succeeded. Hiding Save and making the draft read-only gives a false sense that the route now owns a concrete `app` when old Angular still treats it as an unselected draft.
- Operator workflow clarity: existing-template save should still exit edit mode and catch `originalYaml` up to the backend content; new-template save should keep `selectedApp=null`, preserve the previous draft `originalYaml` boundary, keep edit mode active, and continue showing Save because the editable buffer still differs from the localized starter comment.
- Context visibility: page contracts and browser smoke should distinguish new save from existing save by proving the saved new draft remains editable with `保存并应用` visible, while existing-template save retains the previous apply-success behavior.

## 2026-05-13 YML Query Ownership Plan

- Hierarchy: old Angular `/setting/define` route state is only the selected monitor-template `app` query param plus the in-page menu search. Alert-rule pagination/search belongs to the alert setting route, not the monitor-template YML route.
- Density: keep route state small and transparent. Do not carry alert-rule list pagination, sort, or encoded alert search payloads in the YML define package.
- Anti-AI-slop: do not leave `/alert/defines` helpers under `lib/setting-define` and call that release parity. That artifact came from the suspect alert-rule define implementation and makes the YML package look connected to the wrong backend domain.
- Operator workflow clarity: `/setting/define?app=mysql` should hydrate `currentApp=mysql`; `/setting/define` should hydrate the old new-template draft. Multi-value route params should use the first app value like other compatibility readers.
- Context visibility: contracts should prove `lib/setting-define/query-state.ts` owns only monitor-template route selection and contains no `/alert/defines`, while alert setting keeps its own alert-list URL builder.

## 2026-05-13 YML Menu Order Plan

- Hierarchy: old Angular builds the define menu by iterating `/apps/hierarchy` in backend order, appending each template to its first-seen category, and filtering only `prometheus` plus `__system__`; Next must not alphabetize categories or template rows after normalization.
- Density: the menu should stay a dense backend-owned catalog, not become a client-curated taxonomy with reordered sections that operators cannot map back to template definition order.
- Anti-AI-slop: do not make the list look cleaner by sorting labels if that changes legacy navigation muscle memory or hides backend ordering defects that the old workspace exposed directly.
- Operator workflow clarity: search may filter matching rows, but the relative order of matched categories and rows must remain the same as the original hierarchy response.
- Context visibility: controller and view-model contracts should prove first-seen group order and in-group item order survive filtering, while filtered hidden/system templates are still excluded.

## 2026-05-13 YML Failure Feedback Plan

- Hierarchy: old Angular save/apply failures call `notify.error(common.notify.apply-fail, message.msg)`, so the operator sees both the action-level failure title and the backend explanation. Next must not collapse that into only the raw backend message.
- Density: keep feedback in the existing compact editor message line; do not add a toast rail, alert card, or second message surface to the YML workspace.
- Anti-AI-slop: do not claim mutation parity if the failed save says only `schema invalid` without the old action context `应用失败`. The contract must bind the failed save path to the same apply-fail title used by old Angular.
- Operator workflow clarity: failed save/apply keeps the operator in the same edit/diff context, preserves the changed YAML, and displays the failure title plus backend detail so the next repair step is obvious.
- Context visibility: page contracts and browser smoke should prove the failed `/apps/define/yml` path includes both localized `common.notify.apply-fail` and the backend detail, with no startup reload or success message.

## 2026-05-13 YML Delete Failure Feedback Plan

- Hierarchy: old Angular delete failures call `notify.error(common.notify.delete-fail, message.msg)`, so the monitor-template delete path needs its own delete-failure title plus backend detail instead of the save/apply title or a raw exception.
- Density: keep the failure in the existing compact editor message line. Do not add a new destructive-action panel, persistent warning card, or secondary notification area to the dense YML workspace.
- Anti-AI-slop: do not claim delete parity if the failed delete says only `template is still in use` or renders the untranslated `common.notify.delete-fail` key. The contract must prove the localized delete-failure context is visible.
- Operator workflow clarity: failed delete keeps the selected app, current editor buffer, and edit/read state intact, and must not reset to a new draft, emit delete success, or reload startup/menu context.
- Context visibility: page contract and browser smoke should prove failed `DELETE /apps/{app}/define/yml` includes both `common.notify.delete-fail` and backend detail, with no post-failure startup reload or success message.

## 2026-05-13 YML Visibility Failure Feedback Plan

- Hierarchy: old Angular `updateAppTemplateConfig()` failures call `notify.error(common.notify.apply-fail, message.msg)` for the per-template hide/show config path, so Next must treat visibility changes as apply mutations and keep the action-level apply-failure title.
- Density: keep failed hide/show feedback in the same compact editor message line. Do not add a per-row error rail, warning card, or menu-level status column to the dense template list.
- Anti-AI-slop: do not claim hide/show parity if failed `/config/template/{app}` shows only `visibility locked` or another raw backend string without `应用失败`; that loses the old operator context that this was an apply-style configuration mutation.
- Operator workflow clarity: failed visibility changes must keep the current selected template and editor context unchanged, keep the row in place, and avoid success feedback or startup/menu reload.
- Context visibility: page contract and browser smoke should prove failed `PUT /config/template/{app}` includes both localized `common.notify.apply-fail` and backend detail, with no post-failure `/config/system` or hierarchy reload.

## 2026-05-13 YML Menu Search Filter Plan

- Hierarchy: old Angular `app-monitor-select-list` filters monitor-template sections only by each child template's visible `label`, while category headers remain grouping context for the matched children. Next must not let raw `category` or `value` fields create matches that the old menu would not show.
- Density: keep the existing compact search row and dense grouped list. Do not add extra filter chips, generated helper text, or a second search surface to explain mismatched raw IDs.
- Anti-AI-slop: do not overbroaden search just because raw template fields are available. Searching `database` should not surface every database category row unless a visible template label itself contains `database`.
- Operator workflow clarity: operators search by the same names they see in the list, and filtered results preserve the original backend/category order with only matching child rows visible.
- Context visibility: view-model and browser contracts should prove a label match keeps the row, while raw category/value-only terms collapse the list to the existing empty state without mutating selection or editor context.

## 2026-05-13 YML Category Label Plan

- Hierarchy: old Angular `renderCategoryName(category)` renders menu section headers through `menu.monitor.<category>` and falls back to uppercase only when the translation key is missing. Next must keep those localized category headers instead of exposing raw backend taxonomy keys like `DB`, `OS`, or `CACHE`.
- Density: translate the existing compact group headers in place. Do not add a taxonomy legend, helper copy, or a separate category column to compensate for raw IDs.
- Anti-AI-slop: do not hardcode a local category map inside the YML surface. Category copy belongs to the same i18n keys used by the legacy menu and must fall back cleanly for unknown custom categories.
- Operator workflow clarity: translated section labels should help operators scan by domain while row search still matches only visible template labels, matching the old shared selector behavior.
- Context visibility: view-model and browser contracts should prove known categories render through `menu.monitor.*`, unknown categories keep uppercase fallback, and live `/setting/define` shows localized section context without changing selection or mutation flows.

## 2026-05-13 YML Search Empty-State Plan

- Hierarchy: old Angular `app-monitor-select-list` renders zero menu rows when a search has no matching child labels; it does not tell the operator to create a new monitor-template type while templates already exist.
- Density: keep a compact empty state in the same list slot, but use search-miss copy instead of the global no-template CTA. Do not add a second panel, explanation card, or extra search controls.
- Anti-AI-slop: do not reuse "please create a template" copy for a filtered catalog. A search miss is not a data-empty state and should not push operators toward template creation.
- Operator workflow clarity: when the list has templates and the filter is too narrow, tell the operator to adjust the search while keeping the selected editor, route, and mutation controls unchanged.
- Context visibility: component and browser contracts should prove search misses show the search-empty copy, do not show the create-template empty copy, and selecting/editing context remains intact.

## 2026-05-14 Monitor History Chart Surface Plan

- Hierarchy: old Angular history renders one chart card per numeric metric; Next should keep that direct chart-card scan, but the card shell, title/action density, and footer evidence should be owned by `@hertzbeat/ui` instead of each monitor page hand-writing Tailwind chrome.
- Density: preserve the 460px chart affordance and native ECharts dataZoom controls for history. Do not replace the real chart with a decorative mini SVG or add nested panels around it.
- Anti-AI-slop: do not mark a page-local `section` as "shared-timeseries" while the visual shell is still bespoke business-page markup. Shared visual ownership must be visible through a reusable UI primitive contract.
- Operator workflow clarity: metric selection, local zoom observation, explicit "apply as query time", loading/error/empty states, and sample-count evidence must stay in the same chart slot.
- Context visibility: component contracts should prove monitor history chart cards render through a `@hertzbeat/ui` chart surface while preserving Angular chart-card markers, ECharts dataZoom handoff, selected state, and localized sample counts.

## 2026-05-14 Monitor Realtime Card Surface Plan

- Hierarchy: old Angular realtime detail renders the basic monitor table followed by metric table cards in the same direct two-column scan. Next should preserve that order and density while moving the repeated card surface/title/action structure into `@hertzbeat/ui`.
- Density: keep 400px realtime card affordance, compact table rows, icon-only edit action, and neutral selected state. Do not add nested panels, summary strips, source badges, or large card chrome.
- Anti-AI-slop: do not let every monitor detail sub-card own another hand-written `section/header/body` Tailwind shell. Shared surface ownership should be visible through one reusable workbench-surface primitive.
- Operator workflow clarity: clicking a metric title/table still selects the metric, loading/error states remain inline, and the basic card edit action remains in the same header slot.
- Context visibility: component contracts should prove realtime basic and metric cards render through `@hertzbeat/ui` while preserving Angular markers, table-card layout, edit href, selected metric state, and localized empty/loading copy.

## 2026-05-15 Monitor Realtime Metric Card Ownership Slice

- Hierarchy: the next monitor-detail migration slice focuses on the repeated realtime metric table card, not the whole detail page. The real page may own metric data loading/selection, but card chrome, title affordance, table row density, inline loading/error/empty states, and `/ui-lab` demo parity belong to `@hertzbeat/ui`.
- Density: preserve the old two-column 400px scan and compact metric table rows; avoid new badges, descriptions, or nested sections that would make realtime feel like an OTLP explorer.
- Anti-AI-slop: the page must not keep local `monitor-workbench-metric-table` or metric-card table row markup after the primitive exists. Source contracts should prove the shell moved into the UI package, while render tests keep legacy selectors visible for browser smoke.
- Operator workflow clarity: selecting a metric by title or table body remains a single-click realtime action. Loading, backend error, and empty-table copy stay inline within the same card slot.
- Context visibility: `/ui-lab` must expose the primitive with a stable shared marker before `MonitorDetailSections` consumes it, and the real page must expose `data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"`.

## 2026-05-15 Monitor Realtime Basic Card Ownership Slice

- Hierarchy: this slice completes the realtime two-column card ownership by moving the Basic summary card shell, heading, and edit affordance into `@hertzbeat/ui`; the monitor page still owns the summary facts and labels as business content.
- Density: keep the same 400px first-card footprint, no extra summary strip, no source badge, and the existing icon-only edit action. Do not add copy that tries to explain what a monitor is.
- Anti-AI-slop: the page must not keep a bespoke `MonitorBasicPlainSurface` function that assembles `HzWorkbenchSurface` props, action markup, and Angular card markers locally once the primitive exists.
- Operator workflow clarity: the Basic card remains the first realtime card before metric cards, and the edit icon keeps the same `href`, `aria-label`, and compact hit target.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-basic-card="shared"`, and monitor detail must expose `data-monitor-basic-owner="hertzbeat-ui-basic-card"` while preserving the old Angular markers for browser smoke.

## 2026-05-15 Monitor Manage Pagination Ownership Slice

- Hierarchy: the monitor list footer owns pagination semantics, but the page-size selector, previous/next button rhythm, and compact footer chrome must live in `@hertzbeat/ui` so monitor pages do not hand-write another control strip.
- Density: keep the simple Angular-style footer: page summary on the left, page size plus previous/next on the right. Do not add total metric cards, a second filter rail, icon decoration, or verbose paging explanations.
- Anti-AI-slop: the real page must not keep the bespoke `flex flex-wrap items-center justify-between ...` footer after the shared primitive exists. The shared component must use `HzSelect` so the dropdown behavior and upward placement stay aligned with the lab.
- Operator workflow clarity: changing page size resets page index to 0, previous/next keep the existing query-state handoff, and disabled states remain obvious without adding extra copy.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-pagination="shared"`, and `/monitors` must expose `data-monitor-manage-pagination-owner="hertzbeat-ui-pagination-bar"` while keeping the existing page-size selector and navigation actions functional.

## 2026-05-15 Monitor Manage Delete Confirmation Ownership Slice

- Hierarchy: destructive monitor deletion is an operator confirmation workflow, so the modal chrome, footer buttons, focusable close affordance, and danger tone should be owned by `@hertzbeat/ui`; the monitor page owns only delete copy, selected count, and mutation handler.
- Density: keep one compact confirmation dialog. Do not add a right rail, JSON preview, card stack, or extra explanatory panel. The selected-count evidence can stay as a single bordered line inside the dialog body.
- Anti-AI-slop: the monitor page must not keep importing `OverlayDialog` or hand-writing modal footers once the shared confirmation primitive exists. Confirmation UI should be visible in `/ui-lab` before real-page reuse.
- Operator workflow clarity: the batch toolbar still opens confirmation only after a valid selection, Cancel closes without mutation, Confirm calls the existing delete handler, and disabled state remains tied to selected count/pending action.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-delete-confirm="shared"`, and `/monitors` must expose `data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"` while preserving the old smoke selector `data-monitors-delete-confirm="cold-modal"`.

## 2026-05-15 Monitor Editor Section Ownership Slice

- Hierarchy: new/edit monitor forms can still own field values and validation, but the repeated section chrome for base params, scrape params, labels, annotations, Grafana, and payload facts belongs in `@hertzbeat/ui` so the editor page does not drift into local card styling.
- Density: keep the editor sections as thin, square-edged bands with compact heading/copy rhythm. Do not add icon cards, nested panels, or marketing descriptions; the section body should simply host the real form controls.
- Anti-AI-slop: `MonitorEditorSurface` must not import `SurfaceSection` or reassemble rounded workbench sections locally once the shared monitor-editor section primitive exists.
- Operator workflow clarity: the section primitive preserves the old form order and does not change submit/detect/cancel behavior. This slice is visual ownership only.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-editor-section="shared"`, and monitor new/edit must expose `data-monitor-editor-section-owner="hertzbeat-ui-editor-section"` through every editor section.

## 2026-05-15 Monitor Editor Key-Value Rows Ownership Slice

- Hierarchy: labels and annotations remain monitor business data, but their repeated key/value row chrome, add/remove action rhythm, and compact input pairing belong in `@hertzbeat/ui` instead of the monitor editor page.
- Density: keep two fields plus one remove action per row and one add action underneath. Do not add icons, row descriptions, nested cards, or helper copy that cannot apply to custom metadata.
- Anti-AI-slop: `MonitorEditorSurface` must not keep a page-local `KeyValueEditor` function or import the legacy page `Button` to assemble metadata rows once the shared primitive exists.
- Operator workflow clarity: empty-row fallback, remove-last-row behavior, and label/annotation validation stay unchanged while the visual row structure moves to the shared component.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-key-value-editor="shared"`, and monitor new/edit must expose `data-monitor-editor-key-value-owner="hertzbeat-ui-key-value-editor"` on label and annotation row groups.

## 2026-05-15 Monitor Editor Field Controls Ownership Slice

- Hierarchy: monitor editor still owns values, validation, and API payloads; the compact label/control pairing for text inputs, select menus, radio-backed params, and schedule/base fields belongs in `@hertzbeat/ui`.
- Density: keep one terse label and one control per field. Do not add helper prose, icons, cards, or nested surfaces around normal monitor form controls.
- Anti-AI-slop: `MonitorEditorSurface` must not import legacy `Input`/`Select` or maintain a page-local `fieldLabelClassName` once shared `HzField`, `HzInput`, and `HzSelect` exist.
- Operator workflow clarity: app, scrape, name, collector, schedule, radio, text, number, boolean, and code-like param changes keep the same state update behavior while their field shell moves to the shared UI layer.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-field-controls="shared"`, and monitor new/edit must expose `data-monitor-editor-field-owner="hertzbeat-ui-field"` on shared field rows.

## 2026-05-15 Monitor Editor Textarea Ownership Slice

- Hierarchy: freeform monitor descriptions remain monitor business content; textarea chrome, focus treatment, density, and resize behavior belong in `@hertzbeat/ui` so side-panel fields do not drift from the shared editor rhythm.
- Density: keep the description editor as one compact full-width field with no icon, explanatory helper paragraph, nested card, or oversized padding beyond the section copy already present.
- Anti-AI-slop: `MonitorEditorSurface` must not import the legacy `Textarea` component or expose `data-cold-textarea-owner` for monitor description once `HzTextarea` exists.
- Operator workflow clarity: the description value and `onChange` handler stay unchanged; this slice only changes the visual primitive and ownership marker.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-textarea="shared"`, and monitor new/edit must expose `data-monitor-editor-textarea-owner="hertzbeat-ui-textarea"` on the description control.

## 2026-05-15 Monitor Editor Checkbox Ownership Slice

- Hierarchy: boolean monitor params and Grafana enablement remain monitor business choices, but checkbox chrome, focus state, label rhythm, and checked-state visuals belong in `@hertzbeat/ui`.
- Density: keep each checkbox as one compact row with label text only. Do not add icons, helper prose, nested cards, or explanatory copy around boolean toggles.
- Anti-AI-slop: `MonitorEditorSurface` must not import the legacy `Checkbox` component or expose `data-cold-checkbox-owner` once the shared `HzCheckbox` exists.
- Operator workflow clarity: boolean param and Grafana `checked`/`onChange` behavior stays unchanged; this slice only moves the visual primitive and ownership markers.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-checkbox="shared"`, and monitor new/edit must expose `data-monitor-editor-checkbox-owner="hertzbeat-ui-checkbox"` on shared checkbox controls.

## 2026-05-15 Monitor Editor Number Stepper Ownership Slice

- Hierarchy: interval schedules and numeric monitor params remain monitor business values, but stepper chrome, increment/decrement affordances, clamping, and input focus treatment belong in `@hertzbeat/ui`.
- Density: keep the number stepper as one compact square-edged control with icon-only step buttons and no helper prose, nested cards, or page-local border styling.
- Anti-AI-slop: `MonitorEditorSurface` must not import the legacy `NumberStepper` component or expose `data-cold-number-stepper-owner` once the shared `HzNumberStepper` exists.
- Operator workflow clarity: interval and numeric param `value`/`onValueChange`, min/max/step, and text-input behavior stay unchanged; this slice only moves the visual primitive and ownership markers.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-number-stepper="shared"`, and monitor new/edit must expose `data-monitor-editor-number-stepper-owner="hertzbeat-ui-number-stepper"` on shared number controls.

## 2026-05-15 Monitor Editor Code Editor Frame Ownership Slice

- Hierarchy: JSON/YAML-like monitor param values and Grafana template text remain monitor business payloads, but the editor frame chrome, density, and ownership markers belong in `@hertzbeat/ui`. The CodeMirror runtime can remain an inner child until a full editor primitive is promoted.
- Density: keep one compact framed editor with no helper prose, nested card, duplicate description, or page-local border wrapper around custom monitor values.
- Anti-AI-slop: `MonitorEditorSurface` must not render code editor instances without an explicit shared owner marker once the frame primitive exists.
- Operator workflow clarity: param editor and Grafana template `value`, `onChange`, `language`, `name`, and `minHeight` behavior stay unchanged; this slice only moves the visual shell and ownership marker.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-code-editor-frame="shared"`, and monitor new/edit must expose `data-monitor-editor-code-editor-owner="hertzbeat-ui-code-editor-frame"` around code editor instances.

## 2026-05-15 Monitor Editor CodeMirror Runtime Ownership Slice

- Hierarchy: structured monitor param editing and the Prometheus Grafana template editor should now consume a full `HzCodeEditor` from `@hertzbeat/ui`; the monitor editor page keeps only business values and API draft updates.
- Density: keep the same compact CodeMirror editor, line wrapping, hidden form value, and frame body without introducing a second wrapper, extra title, or helper text.
- Anti-AI-slop: `MonitorEditorSurface` must not import `../ui/cold-code-editor` or render `<ColdCodeEditor>` once the shared runtime primitive exists.
- Operator workflow clarity: `value`, `onChange`, `language`, `name`, `minHeight`, placeholder, readonly, and accessibility label behavior stay unchanged while the runtime ownership moves.
- Context visibility: `/ui-lab` must expose `data-hz-ui-lab-monitor-code-editor="shared"`, and monitor new/edit must expose `data-monitor-editor-code-editor-owner="hertzbeat-ui-code-editor"` with `data-hz-code-editor-runtime="codemirror"`.

## 2026-05-14 Monitor Manage List Table Plan

- Hierarchy: old Angular monitor center renders a dense monitor result list with page-level selection, per-row checkbox, name/detail navigation, status, instance/scrape/app metadata, labels, and updated time. Next should expose that as a reusable `@hertzbeat/ui` data table, not as a page-local evidence/card list.
- Density: keep the compact filter toolbar, batch action strip, and simple pagination footer. Do not add card grids, nested detail cards, oversized row chrome, or marketing summaries.
- Anti-AI-slop: do not call the monitor list "table parity" while routing rows through a generic `SelectableEvidenceList` abstraction that hides monitor-specific columns in page-local JSX blobs.
- Operator workflow clarity: clicking a row still opens monitor detail, row checkbox selection still drives batch actions, and status/app/scrape/update evidence remains visible in the same scan.
- Context visibility: page contracts should prove `/monitors` renders `HzDataTable` with monitor-row owner markers, keeps row selection and detail handoff selectors, and removes the page-local selectable evidence list for the main result list.
