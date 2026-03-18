# WAR-ROOM RUNBOOK — 802.1X / MAB FALLBACK

**Classificazione:** INTERNO — SOLO USO OPERATIVO  
**Turno di riferimento:** 18 marzo 2026 | NOC/SOC/Network Team  
**Owner:** Network Security Operations  
**Versione:** 1.0

---

## INDICE RAPIDO

| Sezione | Contenuto |
|---|---|
| [1. TRIAGE RAPIDO](#1-triage-rapido) | Decision tree per i primi 3 minuti |
| [2. VERIFICA STATO 802.1X](#2-verifica-stato-8021x) | CLI per switch Cisco/Aruba |
| [3. ATTIVAZIONE FALLBACK MAB](#3-attivazione-fallback-mab) | Procedura controllata per porta/VLAN |
| [4. ROLLBACK COMPLETO](#4-rollback-completo) | Disabilitazione 802.1X su uno switch |
| [5. VERIFICA POST-INTERVENTO](#5-verifica-post-intervento) | Conferma ripristino connettività |
| [6. ESCALATION](#6-escalation) | Chi chiamare e quando |
| [7. COMANDI DI RIFERIMENTO RAPIDO](#7-comandi-di-riferimento-rapido) | Cheat-sheet una pagina |

---

## SOGLIE DI ATTIVAZIONE

```
VERDE  → Tutto OK. Monitoraggio standard.
AMBRA  → 5–15% utenti DISCONNESSI su una sede. Verifica + MAB selettivo.
ROSSO  → >15% utenti DISCONNESSI o perdita accesso a sistemi critici.
         → Attivare MAB su tutte le porte affette. Escalation immediata.
NERO   → Rollback 802.1X completo su switch sede. Notify CISO entro 5 min.
```

---

## 1. TRIAGE RAPIDO

```
[ Segnalazione: "non riesco ad accedere alla rete" ]
         |
         v
  Utente su porta 802.1X? ──NO──→ Verificare altri cause (DHCP, DNS, VPN)
         |
        YES
         |
         v
  auth sessions show → stato = ?
         |
      ┌──┴──────────────┐
  AUTHORIZED           FAILED / UNAUTHORIZED
      |                        |
  Problema upstream        → Attivare MAB su porta (Sezione 3)
  (RADIUS, CA, VLAN)       → Se >5 porte: MAB su modulo (Sezione 3b)
```

---

## 2. VERIFICA STATO 802.1X

### 2.1 — Cisco IOS / IOS-XE

```bash
# Stato autenticazione su tutte le porte di uno switch
show authentication sessions

# Stato su porta specifica (es. GigabitEthernet1/0/24)
show authentication sessions interface GigabitEthernet1/0/24 detail

# Contatori RADIUS (errori di comunicazione con il server)
show aaa servers
show radius statistics

# Stato dot1x globale
show dot1x all

# Log eventi di autenticazione (ultimi 100)
show logging | include DOT1X|RADIUS|AUTH|MAB

# Verifica VLAN di quarantena assegnata
show vlan brief | include QUARANTINE
show authentication sessions | include Unauth

# Stato link fisico porta
show interfaces GigabitEthernet1/0/24 status

# Sessioni attive per MAC address (sostituzione xxx.xxx.xxxx)
show mac address-table | include <MAC>
```

### 2.2 — Cisco Catalyst Center / DNA Center (REST API)

```bash
# Recupera tutti i device (requires token)
curl -X GET "https://<DNAC_HOST>/dna/intent/api/v1/network-device" \
  -H "X-Auth-Token: <TOKEN>" \
  -H "Content-Type: application/json" | python -m json.tool

# Stato autenticazione client su uno switch specifico
curl -X GET "https://<DNAC_HOST>/dna/intent/api/v1/client-detail?macAddress=<MAC>" \
  -H "X-Auth-Token: <TOKEN>"
```

### 2.3 — Aruba CX (AOS-CX)

```bash
# Stato autenticazione porte
show port-access clients

# Dettaglio porta specifica
show port-access clients interface 1/1/24

# Stato RADIUS
show radius-server

# Log autenticazione
show logs | match AUTHMGR|RADIUS|DOT1X|MAB
```

### 2.4 — Cisco ISE (Identity Services Engine)

```bash
# Da ISE GUI: Operations → RADIUS → Live Logs
# Filtra per: Identity Group = "Unknown" o Status = "Failed"
# Ricerca per IP switch o MAC endpoint

# Da CLI ISE (SSH)
show application status ise
show logging application ise-psc.log tail 100
```

### 2.5 — Controllo RADIUS da Linux (NPS / FreeRADIUS)

```bash
# Test connettività RADIUS (richede radtest installato)
radtest <utente_test> <password> <IP_RADIUS> 1812 <shared_secret>

# Log FreeRADIUS in tempo reale
tail -f /var/log/freeradius/radius.log | grep -E "ERROR|REJECT|FAIL"

# Stato servizio NPS (Windows — eseguire come Admin da WAR-ROOM PC)
Get-Service -Name "IAS" | Select-Object Status, DisplayName

# Ultimi errori NPS su Windows Event Log
Get-WinEvent -LogName "Security" -MaxEvents 50 |
  Where-Object { $_.Id -in @(6273, 6274, 6276) } |
  Select-Object TimeCreated, Message |
  Format-List
```

---

## 3. ATTIVAZIONE FALLBACK MAB

> **MAB (MAC Authentication Bypass):** permette a un endpoint di autenticarsi tramite indirizzo MAC invece di credenziali 802.1X. Usare SOLO come misura temporanea di emergenza.

### 3a — MAB su singola porta (Cisco IOS/IOS-XE)

```bash
# Accedere allo switch
ssh admin@<IP_SWITCH>

# Entrare in modalità configurazione
configure terminal

# Selezionare la porta problematica
interface GigabitEthernet1/0/24

# Aggiungere MAB come metodo di fallback
# (non rimuove 802.1X, lo affianca in ordine)
authentication order dot1x mab
authentication priority dot1x mab
mab

# Forzare re-autenticazione immediata sulla porta
authentication timer restart 1

# Salva configurazione
end
write memory

# Verifica stato post-intervento
show authentication sessions interface GigabitEthernet1/0/24 detail
```

### 3b — MAB su intero modulo/stack (emergenza AMBRA/ROSSO)

```bash
configure terminal

# Loop su range di porte (es. modulo 1, porte 1-24)
interface range GigabitEthernet1/0/1 - 24
  authentication order dot1x mab
  authentication priority dot1x mab
  mab
  authentication timer restart 1

end
write memory

# Verifica bulk
show authentication sessions | include Gi1/0
```

### 3c — MAB su Aruba CX

```bash
configure terminal

interface 1/1/24
  aaa authentication port-access mac-auth

# Verifica
show port-access clients interface 1/1/24
```

### 3d — MAB via ISE Policy (senza toccare switch) — PREFERITO se ISE è operativo

```
ISE GUI:
  Policy → Policy Sets → Branch-802.1X-Policy
    → Insert Rule PRIMA di "Dot1X-Deny-Unknown"
    → Name: EMERGENCY-MAB-FALLBACK
    → Conditions: Network Access Protocol = MAB
    → Permissions: PermitAccess (o VLAN specifica)
    → Status: ENABLED
  → Save → Push changes
```

---

## 4. ROLLBACK COMPLETO 802.1X (STATO NERO)

> **Usare solo se MAB non risolve o in caso di perdita accesso sistemi critici.**  
> Richiede autorizzazione CISO o Network Lead.

```bash
ssh admin@<IP_SWITCH>
configure terminal

# Disabilitare 802.1X globalmente sullo switch
no dot1x system-auth-control

# Per ogni porta critica: aprire in modalità access non autenticata
interface range GigabitEthernet1/0/1 - 24
  no authentication port-control
  switchport access vlan <VLAN_OPERATIVA>

end
write memory

# Conferma
show interfaces status
show dot1x all
```

> **ATTENZIONE:** Dopo il rollback, tutti gli endpoint accedono senza autenticazione.  
> Aprire ticket P1 e pianificare reintroduzione controllata entro il turno successivo.

---

## 5. VERIFICA POST-INTERVENTO

```bash
# 1. Conferma sessione autenticata (AUTHORIZED)
show authentication sessions interface <PORTA> detail
# Atteso: Auth Status = Authorized, Method = mab (se MAB attivo)

# 2. Verifica VLAN corretta assegnata
show vlan brief
show interfaces <PORTA> switchport

# 3. Test ping dal client (chiedere all'utente o da laptop test)
ping <DEFAULT_GATEWAY>
ping 8.8.8.8

# 4. Conferma RADIUS accounting ricevuto
# ISE → Operations → RADIUS → Accounting → filtra per IP endpoint

# 5. Log switch: nessun nuovo errore AUTH
show logging last 50 | include AUTH|MAB|RADIUS
```

---

## 6. ESCALATION

| Livello | Trigger | Azione | Contatto |
|---|---|---|---|
| L1 NOC | Porta singola FAILED | MAB singola porta (3a) | — |
| L2 Network | >3 porte / switch affetto | MAB modulo (3b) + ISE check | Network Lead on-call |
| L3 Security | ISE irraggiungibile o RADIUS DOWN | Rollback (Sez.4) | CISO + Security Ops |
| CRITICO | >20% sede disconnessa | Bridge call immediata | CTO + CISO |

**Bridge call emergenza:** `+39 XXX XXX XXXX` (aggiornare con numero reale)  
**Canale Slack/Teams:** `#incident-response-live`  
**Ticket ITSM:** aprire P1 con tag `802.1X-FALLBACK` entro 10 minuti dall'intervento

---

## 7. COMANDI DI RIFERIMENTO RAPIDO

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CHEAT-SHEET 802.1X / MAB — TURNO OPERATIVO                 │
├─────────────┬────────────────────────────────────────────────────────────┤
│ VERIFICA    │ show authentication sessions                               │
│             │ show authentication sessions interface <PORTA> detail      │
│             │ show dot1x all                                             │
│             │ show aaa servers                                           │
│             │ show logging | include DOT1X|RADIUS|AUTH|MAB              │
├─────────────┼────────────────────────────────────────────────────────────┤
│ MAB PORTA   │ conf t                                                     │
│ SINGOLA     │ interface <PORTA>                                          │
│             │  authentication order dot1x mab                           │
│             │  authentication priority dot1x mab                        │
│             │  mab                                                       │
│             │  authentication timer restart 1                           │
│             │ end; write memory                                          │
├─────────────┼────────────────────────────────────────────────────────────┤
│ MAB RANGE   │ conf t                                                     │
│ PORTE       │ interface range Gi1/0/1 - 24                              │
│             │  (stessi comandi MAB sopra)                                │
│             │ end; write memory                                          │
├─────────────┼────────────────────────────────────────────────────────────┤
│ ROLLBACK    │ conf t                                                     │
│ COMPLETO    │ no dot1x system-auth-control                              │
│ (SOLO P1)   │ end; write memory                                         │
├─────────────┼────────────────────────────────────────────────────────────┤
│ POST-CHECK  │ show authentication sessions interface <PORTA> detail      │
│             │ show logging last 50 | include AUTH|MAB|RADIUS            │
└─────────────┴────────────────────────────────────────────────────────────┘
```

---

*Runbook generato per il turno operativo del 18 marzo 2026 — Project Ghost-Walk Phase 2*  
*Revisione successiva: fine turno o dopo ogni intervento*
