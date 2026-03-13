# Threat Intelligence Distribution Service
# Distributes new indicators to all tenants

def distribute_indicator(indicator, event_bus):
    event_bus.publish("new_indicator", indicator)
