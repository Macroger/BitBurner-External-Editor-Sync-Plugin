/** @param {NS} ns */
export async function main(ns) 
{
  // ns.args[0] is the name of the server.
  // ns.args[1] is security value used to determine when to stop hacking.

  // Attempt to hack the server.  
  while(ns.args[1] > ns.getServerSecurityLevel(ns.args[0]))
  {
    await ns.hack(ns.args[0]);
  }
}