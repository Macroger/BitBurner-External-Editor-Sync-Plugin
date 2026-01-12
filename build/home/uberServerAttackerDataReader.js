// servers/home/uberServerAttackerDataReader.js
async function main(ns) {
  const statusPortNum = ns.args.length > 0 ? Number(ns.args[0]) : 2;
  const statusPort = ns.getPortHandle(statusPortNum);
  const instanceMap = {};
  ns.tprint("[DataReader] Monitoring uberServerAttacker status on port " + statusPortNum);
  while (true) {
    while (!statusPort.empty()) {
      const msg = statusPort.read();
      if (!msg) continue;
      let status;
      try {
        status = JSON.parse(msg);
      } catch (e) {
        ns.tprint("[DataReader] Failed to parse message: " + msg);
        continue;
      }
      const key = `${status.thisServer || status.server || "unknown"}:${status.pid}`;
      instanceMap[key] = status;
    }
    ns.clearLog();
    ns.print("PID | Server | Target | State | Action | Threads | RAM | Uptime (s)");
    ns.print("---------------------------------------------------------------");
    for (const key in instanceMap) {
      const s = instanceMap[key];
      ns.print(`${s.pid} | ${s.thisServer || s.server || "?"} | ${s.target} | ${s.state} | ${s.action} | ${s.threads} | ${ns.getScriptRam(ns.getScriptName()) * (s.threads || 1)} | ${Math.floor(s.runTime || 0)}`);
    }
    await ns.sleep(500);
  }
}
export {
  main
};
