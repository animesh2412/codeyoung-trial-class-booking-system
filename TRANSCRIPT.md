# Codeyoung Booking Project — Development Prompt & Learning Transcript

## 1. Project planning and architecture

### Prompt 1 — Inspect the project and establish the implementation plan

**User prompt**

> Review the existing MentorSlot workspace and assignment requirements before making broad changes. The stack is React/Vite on the frontend, Node.js/Express on the backend, and MongoDB/Mongoose for persistence. Map the actual folder structure, explain the request flow from the booking form to the database, and identify the minimum complete booking flow. Keep the plan aligned with the assignment: ten mentors, parent-local time selection, mentor assignment, a 30-minute class, a maximum of two demo classes per mentor-local calendar day, and email notifications to both parent and mentor.

**Agent response**

The implementation is organized into a React client and an Express API. The client collects the parent's details, time zone, date, and selected slot; `client/src/lib/api.js` sends requests to the API. The server separates HTTP routing (`server/src/routes/api.js`), booking rules (`server/src/services/bookingService.js`), email delivery (`server/src/services/emailService.js`), data models (`server/src/models/`), and configuration/database setup. The first end-to-end slice is availability lookup → booking validation and mentor assignment → persistent reservation → confirmation response and notification records. This structure keeps scheduling rules out of UI event handlers and makes the important constraints testable at the service layer.

### Prompt 2 — Turn the requirements into verifiable milestones

**User prompt**

> Convert the assignment into implementation milestones with observable acceptance criteria. Prioritize the booking invariants and failure cases before optional dashboards. For every milestone, distinguish what the code should do from what must be demonstrated by a test or a manual check.

**Agent response**

The critical milestones are: establish configuration and database connectivity; seed ten mentors idempotently; expose health, time-zone, and availability endpoints; validate booking requests; implement mentor eligibility and capacity enforcement; connect the React form to the API; persist email-outbox records and attempt SMTP delivery; then test timezone conversion, conflicts, capacity limits, validation failures, and setup from a clean environment. Completion should be based on reproducible evidence rather than the page rendering successfully alone.

## 2. React frontend and API integration

### Prompt 3 — Trace the booking form and its API contract

**User prompt**

> Explain how the selected date, time zone, slot, parent details, loading state, and response are connected. Identify the request payload sent to the backend and explain how the UI should represent validation errors, unavailable slots, booking success, and email status without duplicating backend scheduling logic.

**Agent response**

The React component owns form state and user interaction; `api.js` centralizes HTTP calls and response handling. Availability is requested through `GET /api/slots` with a date and IANA time-zone identifier. A booking is submitted through `POST /api/bookings` with the parent's name, email, time zone, and selected start instant. The frontend should present the result returned by the API and refresh or invalidate stale availability after a booking. It must not decide which mentor is eligible or treat a displayed slot as a guarantee that the slot will still be available when submitted.

### Prompt 4 — Diagnose frontend/backend request failures systematically

**User prompt**

> Give me a layered debugging procedure for a failed booking request. Use the actual Vite API base URL, Express route prefix, CORS configuration, HTTP status, response JSON, and server logs. Distinguish a server that is not running from an incorrect URL, a CORS rejection, a Zod validation failure, a database/transaction error, and an SMTP failure. Avoid speculative edits to unrelated files.

**Agent response — engineering outcome**

Start in the browser Network panel and confirm the exact URL, method, request payload, response status, and response body. The client defaults to `http://localhost:5000/api` unless `VITE_API_URL` is configured. Express mounts the API under `/api`; CORS permits the configured client origin. A 400 response can indicate invalid request data, a 404 indicates an unmatched route, and a 5xx response requires correlation with backend logs. Email delivery is a separate concern from whether the booking request reached the server. Diagnose the failing layer first, then make the smallest change and rerun the same check.

### Prompt 5 — Keep API contracts and error responses consistent

**User prompt**

> Review the Express routes and request validation. Document the purpose and contract of `GET /api/health`, `GET /api/timezones`, `GET /api/slots`, `POST /api/bookings`, and the booking confirmation endpoint. Explain why request validation belongs on the server even when the React form validates input, and check that errors are returned in a predictable JSON structure.

**Agent response**

The API exposes a health check, supported time zones, available slots, booking creation, and confirmation lookup. The booking route validates parent name, email, time zone, and start instant with Zod before calling the booking service. Server-side validation is authoritative because clients can bypass browser checks. Consistent error objects allow the frontend to show a safe message without depending on stack traces or database internals. The actual implementation and response behavior should be checked against the route code rather than assuming undocumented endpoints exist.

---

## 3. Express backend structure and configuration

### Prompt 6 — Separate routing, business rules, and persistence

**User prompt**

> Explain the responsibilities of `server/src/app.js`, `server/src/routes/api.js`, `server/src/services/bookingService.js`, the Mongoose models, and the database/configuration modules. Trace a booking request across those layers. If the API reports success but a booking cannot be found in MongoDB, show how to isolate the defect without rewriting the application.

**Agent response**

`app.js` configures middleware, CORS, rate limiting, routing, 404 handling, and centralized errors. The route parses and validates HTTP input, while `bookingService.js` applies the scheduling rules and coordinates persistence. Mongoose models define stored entities and indexes. Configuration is loaded separately so secrets and environment-specific values do not need to be embedded in source code. To investigate a persistence mismatch, follow the request from route to service, inspect transaction completion and returned data, then verify the correct database and collection. A successful response must correspond to the intended persisted operation.

### Prompt 7 — Configure local development and MongoDB Atlas safely

**User prompt**

> Review the environment-variable approach for the Express server and Vite client. Explain which settings belong in `server/.env` and which non-secret setting may be needed by the frontend. Give me a safe checklist for connecting MongoDB Atlas, configuring the database user and network access, keeping `.env` out of Git, and checking that the running server is connected to the intended database without printing credentials.

**Agent responsee**

The backend reads its MongoDB URI and SMTP settings from environment variables. The frontend only needs the API base URL when it differs from the local default; database credentials must never be placed in `VITE_*` variables because those values are exposed to the browser bundle. Atlas access should use a dedicated database user with only the required permissions and a restricted network-access policy. Environment files must be excluded from version control. If a credential has been exposed, rotate it; adding it to `.gitignore` does not erase it from existing Git history.

---

## 4. MongoDB data model and booking consistency

### Prompt 8 — Explain the persistence model

**User prompt**

> Review the Mongoose models for mentors, bookings, mentor-day capacity, and email outbox records. Explain what each collection represents, which references connect the records, and which indexes support correctness. Identify how the model design supports the assignment's daily limit and notification tracking.

**Agent response**

The mentor model stores mentor configuration, including activity, time zone, and working hours. Booking records preserve the assigned mentor, UTC start/end instants, the parent's time zone, mentor-local booking date, class URL, status, and confirmation token. `MentorDayCapacity` tracks a mentor's usage for a particular local calendar date. `EmailOutbox` records one notification per booking and notification kind, including status, attempts, and failure details. Unique indexes help prevent duplicate outbox records and duplicate mentor/day capacity documents. The service and transaction logic still need to enforce the business invariants; indexes complement that logic rather than replacing it.

### Prompt 9 — Prevent double-booking and enforce the daily quota

**User prompt**

> Review the booking algorithm for two competing requests targeting the same mentor or time. Explain how overlap detection works, how the two-booking daily limit is calculated using the mentor's local calendar date, and why a simple availability check followed by an ordinary insert can fail under concurrency. Evaluate the current conditional capacity update and transaction strategy against the assignment requirements.

**Agent response**

Availability checks are necessary but not sufficient: two requests can observe the same free slot before either writes its booking. The service checks active mentors, working hours, overlapping confirmed bookings, and mentor-day capacity. The capacity record is updated conditionally so that a count cannot be incremented once it has reached the configured limit; booking and capacity changes are coordinated in a MongoDB transaction. This is intended to prevent oversubscription when requests race. Because MongoDB transactions require a replica set or supported sharded deployment, the local database setup must support transactions; MongoDB Atlas is suitable. Concurrency behavior should be tested with competing requests, not inferred from a single successful booking.

### Prompt 10 — Understand transaction boundaries and transaction errors

**User prompt**

> Review the transaction in `createBooking` and identify which writes must succeed or fail together. Explain the consequences of saving the booking, capacity counter, and email-outbox records separately. If Mongoose reports a session-related error when creating multiple outbox documents, determine the precise API usage issue and propose the smallest compatible fix; do not remove the transaction merely to suppress the error.

**Agent response**

The booking, mentor-day capacity update, and required outbox records form one logical operation: a partial commit could reserve capacity without a booking, or create a booking without its notification records. All participating operations must use the same session and the transaction should commit only when the complete set of writes succeeds. Mongoose's array form of `Model.create()` has session-specific usage requirements; the implementation should be checked against the installed Mongoose version and the exact error before changing its options. The fix must preserve atomicity, and the same booking/conflict tests should be rerun afterward.

---

## 5. Time zones, daylight saving, and slot generation

### Prompt 11 — Store time consistently across parent and mentor time zones

**User prompt**

> Review the use of Luxon in `server/src/lib/time.js` and the booking service. Explain the difference between a UTC instant, a local wall-clock time, and an IANA time-zone identifier. Show how a parent's selected time maps to a single instant, how the mentor's local date is derived, and how each recipient's confirmation time should be formatted.

**Agent response**

A booking should be stored and compared using absolute instants, represented in the database as UTC-backed JavaScript `Date` values. IANA identifiers such as `America/New_York`, `Europe/London`, and `Asia/Kolkata` carry the regional rules needed for conversion. The parent's time zone is retained for the parent-facing display; the assigned mentor's time zone is used to determine working hours and the mentor-local calendar date for the daily quota. Email content should convert the same stored instant separately for the parent and mentor, rather than storing two potentially inconsistent local timestamps.

### Prompt 12 — Handle daylight-saving transitions and local-day boundaries

**User prompt**

> Examine the slot-generation logic for daylight-saving gaps, repeated local times, and time-zone day boundaries. Explain why adding a fixed number of hours to a local date can produce incorrect results. Identify the tests needed for US/UK parent time zones and India-based mentors, and distinguish existing automated tests from additional edge cases that still need verification.

**Agent response**

A local calendar day is not always a fixed number of elapsed hours during daylight-saving transitions. Slot generation should use the selected IANA zone and valid instants for that local day; comparisons and overlap checks should use absolute start/end instants. The mentor quota must be keyed to the date in the mentor's own zone, which can differ from the parent's selected date. Tests should cover ordinary dates, transitions into and out of daylight saving, invalid or ambiguous local times, and cases where the same instant falls on different calendar dates for parent and mentor. Passing general timezone utility tests does not by itself prove every booking edge case.

---

## 6. SMTP and notification reliability

### Prompt 13 — Separate booking creation from email delivery

**User prompt**

> Review `server/src/services/emailService.js` and the email-outbox workflow. Explain how Nodemailer obtains its SMTP configuration, how parent and mentor messages use different time zones, and why an SMTP failure must not silently erase an otherwise valid booking. Clarify the difference between an email being accepted by the SMTP server and the recipient actually receiving it.

**Agent response**

The booking service records notification work in the database, and the email service attempts delivery through a Nodemailer transporter configured from server-side SMTP environment variables. Parent confirmation and mentor notification messages format the same booking instant in the relevant recipient's time zone. If SMTP is not configured or delivery fails, the outbox record is marked failed and stores an attempt count and diagnostic error; the booking itself remains a separate persisted result. A successful `sendMail` call indicates acceptance by the SMTP service, not guaranteed inbox delivery. Actual delivery should be verified using controlled test recipients and provider logs where available.

### Prompt 14 — Design retries without claiming an unimplemented worker

**User prompt**

> Inspect the outbox states and retry function. Explain what `pending`, `sent`, and `failed` mean, how attempts and error details are recorded, and what is required to make retries reliable in production. Be precise about whether the current project runs a background worker or scheduler automatically.

**Agent response**

The outbox provides persistent notification state and records attempts, success time, and the most recent error. The existing `retryFailedEmails()` helper can retry failed records when it is invoked, but a retry function is not itself a scheduler. A production setup would need a worker, queue, or scheduled process to invoke retries reliably, with bounded backoff and duplicate-send considerations. The documentation should describe the implemented helper accurately and list automated scheduling as a further improvement unless a worker is actually configured and running.

### Prompt 15 — Configure SMTP and test email delivery safely

**User prompt**

> Give me a focused SMTP setup and troubleshooting checklist for this Node.js project. Explain the roles of `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`; show how to verify the configuration without exposing secrets; and explain how to test both notification types with valid, authorized recipient addresses. Do not treat seeded placeholder email addresses as real delivery targets.

**Agent response**

SMTP configuration belongs in the backend environment, not in the React bundle or committed source. Host, port, TLS mode, credentials, and sender address must match the selected provider. Test with a controlled inbox and check both the API's reported email status and the outbox records. Seeded mentor addresses using example domains are placeholders and must be replaced with authorized test addresses before expecting real messages. Logs should identify the type of failure without printing passwords, full connection strings, or tokens.

---

## 7. Meeting links and confirmation access

### Prompt 16 — Distinguish a configured class URL from generated meeting links

**User prompt**

> Inspect how `DEMO_CLASS_URL` is used in the booking and email flow. Explain exactly what the current implementation sends to the parent and mentor, and distinguish a configured shared/demo URL from generating a unique Google Meet link for every booking. If unique links are required, outline the additional integration without claiming it already exists.

**Agent response**

The current project uses the configured `DEMO_CLASS_URL` as the class link included with booking notifications. It does not automatically create a separate Google Meet conference for each booking. Unique meeting generation would require a meeting-provider integration, appropriate authorization, creation of a calendar event or conference, handling of provider errors, and persistence of the returned meeting URL before the emails are sent. The README and demonstration should describe the configured-link behavior accurately.

### Prompt 17 — Protect booking confirmation lookups

**User prompt**

> Review the booking confirmation token flow. Explain why a confirmation token should be unpredictable, how it is generated and stored, and what information the confirmation endpoint should return. Identify the difference between possession of a tokenized link and a full authenticated parent/mentor dashboard.

**Agent response**

The service generates a high-entropy token using Node's cryptographic random utilities and uses it to look up a booking confirmation. A tokenized confirmation link is a limited-access mechanism, not a complete user identity or role-based authorization system. The endpoint should return only the details needed for confirmation and should avoid exposing unrelated records or internal data. A production dashboard with broader access would need explicit authentication and authorization.

## 8. Security, testing, and release readiness

### Prompt 18 — Review API security controls

**User prompt**

> Review the Express middleware configuration and explain the role and limits of Helmet, CORS, JSON body-size limits, rate limiting, Zod validation, and centralized error handling. Identify which controls reduce common risks and which production controls would still need to be added, without describing CORS as authentication.

**Agent response**

The application disables the Express technology header, applies Helmet security headers, restricts browser origins through CORS configuration, limits JSON payload size, rate-limits API requests, validates booking input with Zod, and returns consistent errors through middleware. These controls reduce exposure to common mistakes and abuse, but CORS does not authenticate a caller. Further production hardening may include stronger operational monitoring, deployment-specific secret management, dependency update procedures, and authentication/authorization if administrative or user-specific dashboards are introduced.

### Prompt 19 — Use automated tests as evidence, not assumptions

**User prompt**

> Review the available Vitest tests and package scripts. Explain what the existing tests establish and what they do not establish about the complete booking workflow. Build a verification matrix for valid booking, invalid input, overlapping slots, the daily quota, timezone conversion, transaction rollback, SMTP failure, and email retry. Mark a scenario as passed only when it has actually been run and observed.

**Agent response**

The repository includes server-side and client-side time utility tests, and the project can be checked with its test and build scripts. Those tests provide useful coverage for time-related functions but do not alone prove concurrent booking correctness, MongoDB transaction rollback, or real SMTP delivery. A complete verification matrix should record the command, setup, expected result, actual result, and status for each scenario. Integration tests need a transaction-capable MongoDB deployment or an appropriate test environment, while SMTP delivery should be verified separately using controlled recipients.

### Prompt 20 — Diagnose the MongoDB transaction requirement

**User prompt**

> Explain why the booking transaction depends on MongoDB replica-set support and how to diagnose a transaction-related failure without weakening the booking guarantees. Give me a verification sequence for Atlas connectivity, database selection, server startup, the health endpoint, and a test booking. Keep credentials out of commands and screenshots.

**Agent response**

## Multi-document transactions are not supported by a standalone MongoDB server, so a transaction-dependent booking service requires a replica set or supported sharded deployment. MongoDB Atlas supports transactions for compatible cluster configurations. Verify the connection string and network access privately, confirm that the backend logs a successful database connection, check `/api/health`, and then exercise the booking path. If a transaction fails, investigate the deployment and session usage rather than removing atomic writes and risking inconsistent capacity or booking data.

---

===========================================================================

**END OF TRANSCRIPT**
