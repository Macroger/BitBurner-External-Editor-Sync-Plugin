// servers/home/remote_hack.js
async function main(ns) {
  while (ns.args[1] > ns.getServerSecurityLevel(ns.args[0])) {
    await ns.hack(ns.args[0]);
  }
}
export {
  main
};
