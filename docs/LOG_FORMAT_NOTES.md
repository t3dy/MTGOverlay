# Log Format Notes

## GRE Messages
The core of the state tracking relies on identifying `GREConnection.HandleWebSocketMessage`.

```
[UnityCrossThreadLogger] GREConnection.HandleWebSocketMessage( { "timestamp": ... "greToClientEvent": { ... } } )
```

We look for the JSON payload inside the parentheses.

## Important Events
- `GREMessageType_GameStateMessage`: Full or partial state updates.
- `GREMessageType_MulliganReq`: Hand information.
- `GREMessageType_ConnectResp`: Initial connection data.
