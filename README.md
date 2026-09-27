# Bhusha

Bhusha is a geospatial land intelligence platform for parcel harmonization, conflict detection, and review-driven administrative action.

## Architecture

This project follows a backend-first architecture:

- Core geospatial engine under `backend/app/engine/`
- API endpoints under `backend/app/api/v1/`
- Frontend portals under `frontend/src/`
- Data fixtures under `data/`

## Key design principle

The real RFP deliverable is the engine, not the dashboard UI.
