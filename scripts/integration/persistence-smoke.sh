#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"

cleanup() {
  docker compose -f "$COMPOSE_FILE" down -v || true
}
trap cleanup EXIT

echo "[1/6] Build required services"
docker compose -f "$COMPOSE_FILE" build mongo grocery marketplace

echo "[2/6] Start required services"
docker compose -f "$COMPOSE_FILE" up -d mongo grocery marketplace

echo "[3/6] Create grocery item"
docker compose -f "$COMPOSE_FILE" exec -T grocery node -e "fetch('http://localhost:5007/api/grocery/items',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'CI Basil',quantity:1,unit:'bunch'})}).then(async r=>{if(!r.ok) throw new Error(await r.text()); const j=await r.json(); console.log(j.item._id);})"

echo "[4/6] Create marketplace listing"
docker compose -f "$COMPOSE_FILE" exec -T marketplace node -e "fetch('http://localhost:5011/api/marketplace/creators').then(r=>r.json()).then(async c=>{const creatorId=c.creators[0]._id; const resp=await fetch('http://localhost:5011/api/marketplace/listings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({creatorId,title:'CI Persistence Listing',priceUsd:14.25})}); if(!resp.ok) throw new Error(await resp.text()); console.log('ok');})"

echo "[5/6] Restart service processes"
docker compose -f "$COMPOSE_FILE" restart grocery marketplace
sleep 5

echo "[6/6] Verify persistence after restart"
docker compose -f "$COMPOSE_FILE" exec -T grocery node -e "fetch('http://localhost:5007/api/grocery/items').then(r=>r.json()).then(j=>{if(!j.items.some(i=>i.name==='CI Basil')){throw new Error('CI Basil not persisted')} console.log('grocery persistence ok')})"
docker compose -f "$COMPOSE_FILE" exec -T marketplace node -e "fetch('http://localhost:5011/api/marketplace/listings').then(r=>r.json()).then(j=>{if(!j.listings.some(i=>i.title==='CI Persistence Listing')){throw new Error('CI listing not persisted')} console.log('marketplace persistence ok')})"

echo "[7/7] Verify gateway routes"
docker compose -f "$COMPOSE_FILE" up -d --no-deps web nginx
sleep 3
docker compose -f "$COMPOSE_FILE" exec -T nginx wget -qO- http://localhost/grocery/health | grep -q '"ok":true'
docker compose -f "$COMPOSE_FILE" exec -T nginx wget -qO- http://localhost/marketplace/health | grep -q '"ok":true'
echo "gateway smoke ok"

echo "Persistence smoke test passed"
