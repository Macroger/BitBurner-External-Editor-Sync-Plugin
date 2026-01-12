// servers/home/ramManagedAttacker.js
async function main(ns) {
  const target = ns.args[0];
  const desiredThreads = ns.args.length > 1 ? Number(ns.args[1]) : 1;
  const priority = ns.args.length > 2 ? Number(ns.args[2]) : 1;
  const requestPortNum = ns.args.length > 3 ? Number(ns.args[3]) : 3;
  const approvalPortNum = ns.args.length > 4 ? Number(ns.args[4]) : 4;
  const requestPort = ns.getPortHandle(requestPortNum);
  const approvalPort = ns.getPortHandle(approvalPortNum);
  const selfName = "ramManagedAttacker";
  const thisServer = ns.getServer().hostname;
  const request = {
    target,
    desiredThreads,
    priority,
    server: thisServer,
    pid: ns.pid,
    timestamp: Date.now()
  };
  requestPort.write(JSON.stringify(request));
  ns.tprint(`[${selfName}] Requested ${desiredThreads} threads for ${target} (priority ${priority})`);
  let grantedThreads = 0;
  while (true) {
    if (!approvalPort.empty()) {
      const msg = approvalPort.read();
      try {
        const approval = JSON.parse(msg);
        if (approval.pid === ns.pid) {
          grantedThreads = approval.grantedThreads;
          break;
        }
      } catch (e) {
      }
    }
    await ns.sleep(100);
  }
  ns.tprint(`[${selfName}] Approved for ${grantedThreads} threads on ${target}`);
  if (grantedThreads > 0) {
    ns.tprint(`[${selfName}] Attacking ${target} with ${grantedThreads} threads...`);
    await ns.hack(target, { threads: grantedThreads });
    ns.tprint(`[${selfName}] Attack complete for ${target}`);
  } else {
    ns.tprint(`[${selfName}] No threads granted, exiting.`);
  }
}
export {
  main
};
