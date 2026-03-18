# Branch Pilot (100 utenti) — Day-by-Day Operational Checklist (NOC / SOC / Network)

> Obiettivo: chiudere AMBER/RED prima e durante il pilot 802.1X, con fallback MAB controllato per evitare interruzioni operative.

## Ruoli e RACI rapido
- **Network Team**: policy 802.1X/MAB, switch/AP, VLAN, ACL/SGT mapping
- **NOC**: monitoraggio in tempo reale, incident triage L1/L2, service continuity
- **SOC**: validazione sicurezza, alerting, threat hunting, escalation security
- **Service Desk**: comunicazioni utenti, onboarding endpoint, ticketing pilot

---

## Day -5 (Kickoff operativo + baseline)
### Target AMBER/RED
- Consolidare registro AMBER/RED dal report audit con owner e data target
- Bloccare scope pilot (utenti, sedi, VLAN, device class)

### Network
- [ ] Congelare configurazione baseline (backup running/startup config)
- [ ] Validare inventory switch/AP/endpoint per perimetro pilot
- [ ] Verificare policy di autenticazione in ordine: **dot1x -> mab -> guest/quarantine**
- [ ] Definire eccezioni temporanee (dispositivi legacy/non supplicant)

### NOC
- [ ] Abilitare dashboard pilot (auth success/fail, fallback rate, port flaps)
- [ ] Definire soglie alert (warning/critical) su auth failure e MAB ratio

### SOC
- [ ] Validare use case di rilevazione bypass (auth anomaly, spoofing MAC, lateral movement)
- [ ] Confermare logging end-to-end (switch, RADIUS/NAC, SIEM)

### Deliverable
- [ ] Registro AMBER/RED firmato (owner, ETA, rischio residuo)
- [ ] Runbook incidenti pilot v1

---

## Day -4 (Pre-remediation tecnica)
### Focus AMBER
- Ridurre rischio operativo senza toccare produzione in modo distruttivo

### Network
- [ ] Allineare firmware minimi raccomandati su switch/AP in finestra sicura
- [ ] Validare reachability RADIUS/NAC primario+secondario (failover test)
- [ ] Verificare timer EAPOL, quiet-period, reauth, deadtime
- [ ] Preparare VLAN di quarantine e ACL minime

### NOC
- [ ] Dry-run alerting e handoff turni
- [ ] Definire war-room e canale bridge operativo

### SOC
- [ ] Test regole su eventi: auth fail burst, MAB spike, endpoint sconosciuti

### Deliverable
- [ ] AMBER backlog ridotto con evidenze test

---

## Day -3 (Chiusura RED tecnici bloccanti)
### Focus RED
- Nessun RED bloccante deve restare aperto per go/no-go

### Network
- [ ] Chiudere RED su infrastruttura critica (RADIUS HA, policy order, VLAN quarantine)
- [ ] Validare profili per device critici (VoIP, stampanti, IoT medici/OT se presenti)
- [ ] Verificare template porte access + rollback per switch

### NOC
- [ ] Simulare outage RADIUS primario e verifica continuità su secondario
- [ ] Simulare link flap e controllo recovery tempi

### SOC
- [ ] Simulare tentativo accesso non autorizzato e verificare detection/alert

### Deliverable
- [ ] Verbale “RED closure” + evidenze test tecnici

---

## Day -2 (Pilot rehearsal + fallback MAB)
### Rehearsal
- [ ] Eseguire rehearsal end-to-end su gruppo ristretto (IT champions)
- [ ] Misurare impatto login, network access time, ticket volume

### Criteri MAB Fallback (anti-disruption)
#### Attivazione fallback (per endpoint o segmento)
- [ ] **Auth failure > 15%** per 10 minuti sul gruppo pilot
- [ ] **Device business-critical** non supplicant/non compliant
- [ ] **RADIUS timeout** persistente oltre soglia operativa (es. > 60s cumulati / 5 min)
- [ ] Incremento ticket P1/P2 correlati autenticazione

#### Regole di fallback sicuro
- [ ] MAB **solo** per MAC preregistrati o profili autorizzati
- [ ] MAB su VLAN limitata/ACL restrittiva (least privilege)
- [ ] Durata fallback time-boxed (es. 24h) con review obbligatoria
- [ ] Logging completo + flag SOC “MAB exception active”

#### Uscita dal fallback
- [ ] Root cause risolta e testata
- [ ] Tasso auth fail rientrato sotto soglia (es. < 5% per 30 min)
- [ ] Chiusura eccezione con approvazione Network+SOC

### Deliverable
- [ ] Playbook MAB fallback v1.0 approvato

---

## Day -1 (Go/No-Go)
### Gate di rilascio
- [ ] RED = 0
- [ ] AMBER con mitigation attiva e owner assegnato
- [ ] Monitoring/alerting confermato (NOC+SOC)
- [ ] Rollback testato e tempo di esecuzione noto

### Comunicazione
- [ ] Notifica utenti pilot (finestra, possibili impatti, canale supporto)
- [ ] Escalation matrix condivisa (L1→L2→L3)

### Deliverable
- [ ] Verbale Go/No-Go firmato

---

## Day 0 (Pilot rollout)
### Esecuzione
- [ ] Attivazione pilot a onde (Wave 1: 20 utenti, Wave 2: 30, Wave 3: 50)
- [ ] Monitor real-time auth success/fail per wave
- [ ] Applicare fallback MAB solo con criteri formalizzati

### NOC
- [ ] Triage continuo ticket e classificazione (config/user/device)
- [ ] Aggiornamento ogni 30 min in war-room

### SOC
- [ ] Sorveglianza su anomalie accesso e tentativi bypass
- [ ] Correlazione eventi NAC + endpoint + SIEM

### Deliverable
- [ ] Report Day 0: KPI accesso, ticket, incidenti, fallback attivati

---

## Day +1 (Stabilizzazione)
### Network
- [ ] Rimozione fallback non più necessario
- [ ] Fine tuning timer/policy su evidenze Day 0

### NOC
- [ ] Analisi ticket ricorrenti + azioni preventive

### SOC
- [ ] Review eventi sicurezza, falsi positivi, tuning regole

### Deliverable
- [ ] Stabilization report + backlog AMBER residuo

---

## Day +2 / +3 (Hardening e handover)
- [ ] Chiusura AMBER residui prioritari
- [ ] Standardizzare template validati per rollout successivi
- [ ] Aggiornare runbook operativo definitivo
- [ ] Sessione handover a team BAU (NOC/SOC/Network)

### Deliverable
- [ ] Pilot closure report + readiness per Phase 2 estesa (Branch Office rollout)

---

## KPI minimi da tracciare durante pilot
- Auth success rate (802.1X) [%]
- Auth failure rate [%]
- MAB fallback ratio [% endpoint]
- Tempo medio accesso rete (sec)
- Ticket volume P1/P2 correlati auth
- Incidenti security correlati accesso (count)

---

## Definizione “Successo Pilot” (exit criteria)
- [ ] Auth success >= 95%
- [ ] Auth failure <= 5% stabile 24h
- [ ] MAB fallback <= 10% e in riduzione
- [ ] Nessun incidente P1 aperto > 2h
- [ ] Nessun RED aperto
