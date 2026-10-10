## ADDED Requirements

### Requirement: Error body shape

The service SHALL return each error as a JSON body containing an `error` code and a `mensaje`
string, matching the original exactly.

#### Scenario: Error payload

- **WHEN** an `ALTA` carries an invalid control
- **THEN** the service responds `{"error":"E202","mensaje":"control inválido"}`

### Requirement: Error precedence

The service SHALL evaluate error conditions in a fixed order and SHALL return the highest-priority
failing condition only.

#### Scenario: Unknown command before other checks

- **WHEN** an unknown command such as `SALDOS` is sent
- **THEN** the service responds `400` with `E301`, not an arity or control error

#### Scenario: Control format before value

- **WHEN** a known command carries a non-numeric control
- **THEN** the service responds `E201`, not `E202`

### Requirement: Unknown command

The service SHALL reject an unrecognized command with HTTP `400` and error `E301`, preserving the
original message's trailing space.

#### Scenario: Unknown command body

- **WHEN** `SALDOS;AC-0001;38` is sent
- **THEN** the service responds `{"error":"E301","mensaje":"comando desconocido "}`

### Requirement: Invalid arity

The service SHALL reject a known command with the wrong field count with HTTP `400` and error
`E302`.

#### Scenario: Wrong arity

- **WHEN** `ALTA;Lucia;Gomez;11` is sent
- **THEN** the service responds `400` with error `E302`

### Requirement: Missing entity

The service SHALL reject a reference to a nonexistent account with HTTP `404` and error `E401`.

#### Scenario: Nonexistent account

- **WHEN** `CONSULTA;AC-0009;87` is sent
- **THEN** the service responds `404` with error `E401`

### Requirement: Unknown route and method

The service SHALL respond to any route or method other than the defined endpoints exactly as the
original does, including nonexistent routes.

#### Scenario: Nonexistent route

- **WHEN** a client requests a route that does not exist
- **THEN** the service mirrors the original response for that route

### Requirement: Bad or missing token

The service SHALL respond to a bad or missing token exactly as the original does.

#### Scenario: Wrong token

- **WHEN** a request carries an `Authorization` header with a token that is not the team token
- **THEN** the service mirrors the original response for that token
