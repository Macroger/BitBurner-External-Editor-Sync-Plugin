// servers/home/maxServerNameLength.js
async function main(ns) {
  serverScan(ns.args[0]);
  function serverScan(target) {
    let maxNameLengthDetected = 0;
    let servers = ns.scan(target);
    for (let potentialTarget of servers) {
      maxNameLengthDetected = maxNameLengthDetected < potentialTarget.length ? potentialTarget.length : maxNameLengthDetected;
      ns.tprintf("Found server: %s. Max name length so far: %d", potentialTarget, maxNameLengthDetected);
      const moreServers = ns.scan(potentialTarget);
      for (let x of moreServers) {
        ns.tprintf("Found server: %s.", x);
      }
    }
  }
}
export {
  main
};
