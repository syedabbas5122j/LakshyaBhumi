# Role Authority Matrix

## Status

This is the working authorization baseline supplied for the platform. Department owners must approve role assignments and jurisdiction rules before production use.

## Run AI Harmonization

Only these roles may start harmonization runs:

| Role | Administrative level |
| --- | --- |
| State GIS Coordinator | State |
| Director of Survey & Land Records | State |
| Chief Cartographer | State |
| District Survey Officer | District |
| District Land Records Officer | District |
| Commissioner of Land Administration | State |
| GIS Manager (Municipality) | Urban local body |

The API enforces this allowlist. District Collectors, MROs, Tahsildars, field surveyors, and other roles do not receive run authority by virtue of having a harmonization or version-history screen.

## View Version History

The officer workspace exposes the illustrative version-history screen to the roles below when those roles already exist in the application:

| Role group | Existing roles |
| --- | --- |
| Administrative reviewers | District Collector / District Magistrate; Mandal Revenue Officer (MRO); Tahsildar |
| Urban authorities | Municipal Commissioner; Chief Town Planner |
| Field and cartographic QA | Village Surveyor; Ground Truth Surveyor; Chief Cartographer |
| Harmonization operators | The seven run-authorized roles above |

Joint Collector and Revenue Divisional Officer (RDO) are not currently defined as application roles. Do not add them as login roles until their identity records and jurisdiction policy are approved.

Land owners, buyers/sellers, lawyers, and bank/mortgage officers should receive read-only access to **published** versions only. That access is not enabled: the current version-history screen uses illustrative data, and live run records do not carry publication state or sufficient geographic scope for safe filtering.

## Data-flow Constraints

- A role allowlist does not replace district, mandal, municipality, or village authorization.
- Harmonization must only consume source and target datasets authorized for the caller's assigned area.
- Version lists and downloads must be filtered by jurisdiction and publication status before the live API is opened to additional viewers.
- Harmonized outputs are review artifacts; they must not silently update authoritative cadastral or legal records.
- Run, review, approval, publication, and download actions must be attributable to an authenticated actor in audit history.

## Current Implementation Boundary

The frontend labels version history as illustrative demo runs. The live `/engine/runs` list and download endpoints remain restricted to harmonization operators because they return unscoped run records. Public and additional officer viewing is a follow-up task, not a production-ready capability.