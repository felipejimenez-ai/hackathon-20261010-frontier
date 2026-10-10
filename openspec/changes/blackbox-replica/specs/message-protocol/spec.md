## ADDED Requirements

### Requirement: Health endpoint

The service SHALL expose `GET /health` and return HTTP `200` when ready.

#### Scenario: Health ready

- **WHEN** a client sends `GET /health`
- **THEN** the service responds `200`

### Requirement: Reset endpoint

The service SHALL expose `POST /__reset`, returning the requesting token to its initial state.

#### Scenario: Reset clears state

- **WHEN** a client sends `POST /__reset` after creating accounts
- **THEN** subsequent requests for that token behave as if no accounts existed

#### Scenario: Reset with another or missing token mimics original

- **WHEN** a client sends `POST /__reset` without the team token
- **THEN** the service responds exactly as the original service does

### Requirement: Token routing

The service SHALL partition state by `Authorization: Bearer <token>`, and for a bad or missing
token SHALL respond exactly as the original service.

#### Scenario: Valid token isolates state

- **WHEN** two tokens each create an account
- **THEN** each token only observes its own accounts

#### Scenario: Missing token

- **WHEN** a message is sent with no `Authorization` header
- **THEN** the service mirrors the original response for missing token

### Requirement: Message parsing

The service SHALL parse `POST /msg` bodies of the form `{"m": "CMD;arg;...;control"}` by splitting
on `;` and SHALL treat the last field as the control value.

#### Scenario: Last field is control

- **WHEN** a message `PING;64` is parsed
- **THEN** the command is `PING` and the control is `64`

### Requirement: Control validation

The service SHALL validate the control field and SHALL reject a non-numeric control as `E201` and a
numeric control that fails the checksum as `E202`.

#### Scenario: Malformed control

- **WHEN** a message carries a non-numeric control such as `DEPOSITO;AC-0002;700;5X`
- **THEN** the service responds `400` with error `E201`

#### Scenario: Invalid control

- **WHEN** a message carries a numeric control that fails the checksum such as `ALTA;Lucia;83`
- **THEN** the service responds `400` with error `E202`

### Requirement: Case-insensitive command dispatch

The service SHALL resolve commands case-insensitively.

#### Scenario: Mixed-case command

- **WHEN** a client sends `CONSULta;AC-0001;14`
- **THEN** the service treats it as `CONSULTA`

### Requirement: Exact response serialization

The service SHALL return bodies byte-identical to the original, including preserved typos; JSON
object key order is not significant, but strings and numbers must match exactly.

#### Scenario: Preserved typo

- **WHEN** a `DEPOSITO` succeeds
- **THEN** the body contains `"status":"recieved"` (original spelling)
