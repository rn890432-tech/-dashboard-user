/**
 * OMNI-SOC FINAL DEMO: MARCH 11, 2026
 * Execute this to show the Board the Lockdown vs. The Strike
 */
const runFinalDemo = () => {
  console.log("🛡️ [SYSTEM] INITIALIZING DEFENSIVE LOCKDOWN...");
  io.emit('shield_status', { active: true, mode: "STEALTH" });

  // 1. The Handala Wiper Strike (Tehran -> Cork/US)
  // Target: Finance User on Host FIN-WS-01
  setTimeout(() => {
    io.emit('security_event', {
      type: 'destructive',
      name: "Handala Wiper Payload (Detected)",
      status: "neutralized", // <--- THE SHIELD WORKS
      userData: { username: "jsmith_finance", hostname: "FIN-WS-01" }
    });
    console.log("✅ [NEUTRALIZED] Handala Wiper Strike on Finance Node.");
  }, 2000);

  // 2. The BlackSanta Probe (Moscow -> HR)
  // Target: HR User on Host HR-LAPTOP-04
  setTimeout(() => {
    io.emit('security_event', {
      type: 'credential',
      name: "BlackSanta EDR-Killer (Blocked)",
      status: "neutralized",
      userData: { username: "sarah_hr", hostname: "HR-LAPTOP-04" }
    });
    console.log("✅ [BLOCKED] BlackSanta Kernel Driver Load Attempt on HR.");
  }, 4000);
};

// Launch the demo
runFinalDemo();
