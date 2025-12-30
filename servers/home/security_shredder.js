/** @param {NS} ns */
export async function main(ns) {

  // This script is designed to unleash all hell on a particular server.
  // I envision this script targeting a server and releasing multiple copies
  // of itself to perform multiple weaken commands simulataneously.
  // The user should provide an argument that is the target server name.

  if(ns.args.length === 0)
  {
    ns.tprintf("No argument provided. This script requires a hostname be provided as first argument.");
    ns.exit();
  }
  // The target server.
  const target = ns.args[0];
    
  const securityGoal = (ns.getServerSecurityLevel(target) == ns.getServerMinSecurityLevel(target)) ? 0 : (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) / 2;

  // This loop should continue until the security level reaches half of what it started at.
  while(true)
  {
    if(ns.getServerSecurityLevel(target) <= (ns.getServerMinSecurityLevel(target) + securityGoal))
    {
      // Maximum amount of weakening achieved, time to exit.
      ns.printf("Maximum amount of weakening achieved, exiting script.");
      ns.exit();
    }
    else
    {
      await ns.weaken(target);
    }        
  }
}