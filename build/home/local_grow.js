// servers/home/local_grow.js
async function main(ns) {
  const target = ns.args[0];
  await ns.grow(target);
}
export {
  main
};
