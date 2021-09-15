require("dotenv").config();
const Transport = require("winston-transport");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = class PrismaTransport extends Transport {
  constructor(options = {}) {
    super(options);
    // Name the Logger
    this.name = options.name || "PrismaTransport";
    // Table Name
    this.table = options.table || "log";
    // Website the log relates to
    this.site = options.site || "My Site";
    // Error Level
    this.level = options.level || "info";
  }

  log(level, message, meta, callback) {
    const { table, site } = this;

    const prismaData = {
      time: new Date().toISOString(),
      level: level,
      error: message,
      site: site,
    };

    return prisma[table]
      .create({ data: prismaData })
      .then(() => {
        prisma.$disconnect();
        this.emit("logged", message);
        callback(null, true);
      })
      .catch((e) => {
        prisma.$disconnect();
        this.emit("error", e.stack);
        callback(e.stack);
        return null;
      });
  }
};
