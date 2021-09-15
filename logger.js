const { createLogger } = require("winston");
const PrismaTransport = require("./lib/prisma-transport");

const logger = createLogger({
  transports: [
    new PrismaTransport({
      table: "log",
      site: "anothersite.com",
    }),
  ],
});

module.exports = logger;
