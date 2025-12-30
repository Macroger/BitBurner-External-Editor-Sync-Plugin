// servers/home/security_shredder.js
async function main(ns) {
  if (ns.args.length === 0) {
    ns.tprintf("No argument provided. This script requires a hostname be provided as first argument.");
    ns.exit();
  }
  const target = ns.args[0];
  const securityGoal = ns.getServerSecurityLevel(target) == ns.getServerMinSecurityLevel(target) ? 0 : (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) / 2;
  while (true) {
    if (ns.getServerSecurityLevel(target) <= ns.getServerMinSecurityLevel(target) + securityGoal) {
      ns.printf("Maximum amount of weakening achieved, exiting script.");
      ns.exit();
    } else {
      await ns.weaken(target);
    }
  }
}
export {
  main
};
