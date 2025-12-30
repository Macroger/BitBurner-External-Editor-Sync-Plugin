// servers/home/shareRam.js
async function main(ns) {
  while (true) {
    await ns.share();
  }
}
export {
  main
};
