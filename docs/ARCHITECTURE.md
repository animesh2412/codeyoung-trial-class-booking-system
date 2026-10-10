# Architecture and key decisions

## Request flow

1. Parent chooses a local date and IANA time zone in the React UI.
2. `GET /api/slots` walks through actual instants in that local calendar day, asks the scheduler which mentors are eligible, and returns UTC instants with local labels and offsets.
3. Parent submits a selected UTC instant with name, email, and IANA time zone.
4. Express validates the payload. The booking service starts a MongoDB transaction.
5. The service checks mentor-local working hours, existing overlaps, and the daily count. A conditional capacity increment enforces `count < 2`.
6. Booking and parent/mentor outbox records are written in the same transaction. A transaction conflict or duplicate slot becomes a clear `409` rather than an overbooking.
7. SMTP attempts happen after commit. A failed email is stored as failed without deleting the booking.
8. UI displays confirmation and the two email statuses.

## Time model

- Persist start/end as UTC instants.
- Persist parent and mentor IANA time-zone identifiers separately.
- Derive `mentorLocalDate` using the mentor's zone; this is the date used for the two-per-day cap.
- Generate available starts by advancing real instants in 30-minute increments from the start of the parent's local day. This avoids creating a nonexistent wall time during a spring-forward gap and traverses both instances of a repeated fall-back hour.
- Format all email timestamps in the recipient's own zone.

## Trade-offs

- MongoDB was selected because the project owner already has it configured. Transactions require Atlas or a local replica set; a standalone local server is not sufficient for the concurrency guarantee.
- A 30-minute duration and 10:00–18:00 mentor-local working window are explicit demo assumptions and can be changed in configuration/schema.
- The scheduler uses first-eligible mentor assignment ordered by mentor name for deterministic behavior. More sophisticated load balancing is outside the core assignment scope.
- Admin/mentor dashboards are deferred as the assignment explicitly makes them optional.
- SMTP is kept separate from the transaction. External mail delivery cannot participate in a MongoDB transaction, so the outbox persists delivery status and a mail failure never falsely rolls back a booking.
