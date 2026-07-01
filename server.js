// Root launcher so `node server.js` works from the project root.
(async () => {
  await import("./backend/server.js");
})();
