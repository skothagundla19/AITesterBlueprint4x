- Verified Facts:
1. Scope is DataOps -> Request -> Filter selection.
2. Filter dropdown must show only Active suppression filters.
3. Inactive suppression filters must not be shown in the dropdown.
4. In Edit Request, if currently selected filter became Inactive, it must still be displayed on edit screen.
5. In Edit Request, save/update without changing the inactive filter must show an error popup indicating selected filter is inactive.
6. In Edit Request, user can select an active filter and then save successfully.
7. In Duplicate Request, if original request has an Inactive filter, duplicate action must still succeed.
8. In Duplicate Request, during save, error popup must be shown indicating selected filter is inactive.
9. In Duplicate Request, user can choose an active filter and save duplicated request successfully.

- Missing / Unknown Information:
1. Exact popup text content is not provided.
2. Exact UI labels for buttons/menus are not provided.
3. Exact navigation steps to DataOps -> Request are not provided.
4. Exact identifiers/names of filters are not provided.
5. Whether error popup blocks save with hard stop vs soft warning is not explicitly stated beyond error popup expectation.

- Generated Output:

| TC ID | Type | Objective | Preconditions | Steps | Expected Result | PRD Trace |
|---|---|---|---|---|---|---|
| TC-24568-01 | Functional | Verify filter dropdown shows only Active suppression filters | At least one Active and one Inactive suppression filter exist. | 1. Open Request filter selection dropdown. 2. Observe displayed suppression filters. | Only Active suppression filters are displayed. | #1 Filter Dropdown Behavior |
| TC-24568-02 | Negative | Verify Inactive suppression filters are not shown in dropdown | At least one Inactive suppression filter exists. | 1. Open Request filter selection dropdown. 2. Search/scan for known Inactive suppression filter. | Inactive suppression filter is not present in dropdown. | #1 Filter Dropdown Behavior |
| TC-24568-03 | Functional | Verify Edit screen still displays selected filter when it has become Inactive | Existing request is available with selected suppression filter that is now Inactive. | 1. Open existing request in Edit mode. 2. View selected filter value on edit screen. | Previously selected Inactive filter is displayed on edit screen. | #2 Edit Request Behavior |
| TC-24568-04 | Negative | Verify error popup on Edit save/update when inactive filter is unchanged | Existing request in Edit mode has selected Inactive filter displayed. | 1. Open existing request in Edit mode. 2. Do not change selected Inactive filter. 3. Click save/update. | Error popup is displayed indicating selected filter is inactive. | #2 Edit Request Behavior |
| TC-24568-05 | Functional | Verify Edit save succeeds after selecting an Active filter | Existing request in Edit mode currently has selected Inactive filter. At least one Active suppression filter exists. | 1. Open existing request in Edit mode. 2. Change selected filter to an Active suppression filter. 3. Click save/update. | Request is saved successfully with selected Active filter. | #2 Edit Request Behavior |
| TC-24568-06 | Functional | Verify Duplicate action succeeds when original request has Inactive filter | Existing request with selected Inactive filter is available for duplication. | 1. Start duplicate action for request with Inactive filter. 2. Complete duplicate creation flow until save step. | Duplicate request is created/opened successfully for save flow, despite inherited Inactive filter. | #3 Duplicate Request Behavior |
| TC-24568-07 | Negative | Verify error popup during duplicated request save when inactive filter is unchanged | Duplicated request contains inherited Inactive filter. | 1. Open duplicated request save flow. 2. Keep inherited Inactive filter unchanged. 3. Click save. | Error popup is displayed indicating selected filter is inactive. | #3 Duplicate Request Behavior |
| TC-24568-08 | Functional | Verify duplicated request can be saved after changing to Active filter | Duplicated request contains inherited Inactive filter. At least one Active suppression filter exists. | 1. Open duplicated request. 2. Change filter to an Active suppression filter. 3. Click save. | Duplicated request is saved successfully. | #3 Duplicate Request Behavior |
| TC-24568-09 | Negative | Verify Edit flow does not allow proceeding to successful save with unchanged Inactive filter | Existing request in Edit mode has selected Inactive filter. | 1. Open request in Edit mode. 2. Attempt save/update without changing Inactive filter. | Save/update success is not achieved; error popup is shown for inactive filter. | #2 Edit Request Behavior |
| TC-24568-10 | Negative | Verify Duplicate flow does not allow successful save until Active filter is selected | Duplicated request has inherited Inactive filter and at least one Active filter exists. | 1. Attempt save with unchanged Inactive filter. 2. Observe error popup. 3. Select Active filter. 4. Save again. | First save attempt fails with inactive filter popup; second save succeeds after selecting Active filter. | #3 Duplicate Request Behavior |

Notes for execution discipline:
1. If any prerequisite data is unavailable, report: Insufficient information to determine.
2. For popup message validation, assert only "indicates selected filter is inactive" because exact text is not provided.
3. Do not add assertions for APIs, logs, permissions, or non-PRD behaviors.

- Self-Validation Check:
1. Case count is exactly 10.
2. Functional coverage present for Dropdown, Edit, and Duplicate flows.
3. Negative coverage present for Dropdown exclusion and save error paths in Edit and Duplicate flows.
4. All expected results are traceable to PRD #24568 statements.
5. Unspecified details are listed under Missing / Unknown Information and not assumed as facts.
