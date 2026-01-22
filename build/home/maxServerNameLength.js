// servers/home/myFunctions.js
function scanForAllServers(ns, startingPoint = "home") {
  const serverMap = /* @__PURE__ */ new Map();
  const queue = [];
  serverMap.set(startingPoint, { name: startingPoint, scanned: false, parent: null });
  queue.push(startingPoint);
  while (queue.length > 0) {
    const current = queue.shift();
    const serverObj = serverMap.get(current);
    if (!serverObj.scanned) {
      const neighbors = ns.scan(current);
      for (const neighbor of neighbors) {
        if (!serverMap.has(neighbor)) {
          serverMap.set(neighbor, { name: neighbor, scanned: false, parent: current });
          queue.push(neighbor);
        }
      }
      serverObj.scanned = true;
    }
  }
  return Array.from(serverMap.values());
}

// servers/home/maxServerNameLength.js
async function main(ns) {
  function enumerateServerNameLength(servers2) {
    let newNameLength = 0;
    let maxNameLengthDetected = 0;
    let serverWithMaxNameLength = "";
    for (let potentialTarget of servers2) {
      newNameLength = potentialTarget.name.length;
      if (newNameLength > maxNameLengthDetected) {
        maxNameLengthDetected = newNameLength;
        serverWithMaxNameLength = potentialTarget;
      }
    }
    ns.tprint(`Maximum server name length detected: ${maxNameLengthDetected} on server: ${serverWithMaxNameLength.name}`);
  }
  const servers = scanForAllServers(ns);
  ns.tprint(`Total servers scanned: ${servers.length}`);
  enumerateServerNameLength(servers);
}
export {
  main
};
