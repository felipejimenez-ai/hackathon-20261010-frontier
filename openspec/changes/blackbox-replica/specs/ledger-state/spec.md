## ADDED Requirements

### Requirement: Account creation

The service SHALL create an account on `ALTA;name;control`, returning HTTP `201` with an
incrementing id `AC-####` scoped to the token.

#### Scenario: Create account

- **WHEN** a client sends `ALTA;Lucia;82` on a fresh token
- **THEN** the service responds `201` with `{"cuentaId":"AC-0001"}`

#### Scenario: Second account increments id

- **WHEN** a client then sends `ALTA;Mateo;3`
- **THEN** the service responds `201` with `{"cuentaId":"AC-0002"}`

### Requirement: Deposit

The service SHALL credit a deposit on `DEPOSITO;account;amount;control`, returning HTTP `200` with
an incrementing operation id `OP-####`.

#### Scenario: Deposit increases balance

- **WHEN** `DEPOSITO;AC-0001;250000;86` succeeds then `CONSULTA;AC-0001;14` is sent
- **THEN** the reported balance reflects the deposit

### Requirement: Transfer

The service SHALL move funds on `TRANSFER;from;to;amount;control`, returning HTTP `200` with an
`OP-####` id, HTTP `422` `E506` when a limit is exceeded, and HTTP `422` `E507` when funds are
insufficient.

#### Scenario: Transfer within limits

- **WHEN** `TRANSFER;AC-0001;AC-0002;40000;86` is sent with sufficient funds
- **THEN** the service responds `200` with a new `OP-####`

#### Scenario: Limit exceeded

- **WHEN** `TRANSFER;AC-0001;AC-0002;120000;55` exceeds the configured limit
- **THEN** the service responds `422` with error `E506`

#### Scenario: Insufficient funds

- **WHEN** a transfer exceeds the source balance
- **THEN** the service responds `422` with error `E507`

### Requirement: Balance query

The service SHALL return the current balance on `CONSULTA;account;control` as HTTP `200` with
`cuenta_id` and `saldo`.

#### Scenario: Query balance

- **WHEN** `CONSULTA;AC-0002;11` is sent after a deposit of `700`
- **THEN** the service responds `200` with `saldo` equal to the accumulated balance

### Requirement: Operation annulment

The service SHALL annul an operation on `ANULA;opId;control` and SHALL be idempotent.

#### Scenario: First annulment

- **WHEN** `ANULA;OP-0003;66` is sent for an existing operation
- **THEN** the service responds `200` with `{"ok":true,"anulada":"OP-0003"}`

#### Scenario: Repeated annulment

- **WHEN** the same `ANULA;OP-0003;66` is sent again
- **THEN** the service responds `200` with `{"ok":false,"motivo":"ya anulada"}`

### Requirement: Per-token memory

The service SHALL retain, per token, account balances, operation ids, the annulled-operation set,
and counters, until `POST /__reset`.

#### Scenario: Memory across requests

- **WHEN** a sequence deposits and transfers then queries the source account
- **THEN** the balance equals the net of all prior operations for that token
