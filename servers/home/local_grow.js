/** @param {NS} ns */
export async function main(ns) {

  // The target is the hostname of the server to be targeted. 
  // This shoule be provided to this script as the first argument as a string.
  const target = ns.args[0];

  // This loop will continue forever, growing the server until stopped by an external force.
  while(true)
  {    
    await ns.grow(target);
  }
}