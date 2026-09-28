# Role Authority Tasks

## Completed in this change

- [x] Add GIS Manager (Municipality) to the backend harmonization-run allowlist.
- [x] Add the Harmonization entry point and feature card to the GIS Manager workspace.
- [x] Add the illustrative Version History entry to existing officer roles in the supplied viewer matrix.
- [x] Add API tests proving GIS Manager run access and Collector denial.
- [x] Keep the unscoped live run-list API closed to additional version viewers.

## Remaining before production

- [ ] Approve the role/action matrix with Andhra Pradesh department owners.
- [ ] Add Joint Collector and RDO only after role identities, jurisdiction fields, and approval powers are specified.
- [ ] Persist and enforce upload, source, target, run, list, and download jurisdiction at district, mandal, municipality, and village levels.
- [ ] Add a version publication workflow and distinguish draft, in-review, published, and superseded outputs in backend storage.
- [ ] Build a version-history API that filters records by caller jurisdiction and publication state; add API tests for cross-area denial.
- [ ] Add a read-only published-version view for Land Owner, Property Buyer / Seller, Property Lawyer, and Bank / Mortgage Officer after field-level data disclosure is approved.
- [ ] Audit every run, review, approval, publication, download, and rollback with actor and timestamp.
- [ ] Replace illustrative demo version rows with the authorized live version API after the scope and publication checks are complete.