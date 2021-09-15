# winston-prisma

---

A Prisma logger for the winston logging library

# Installation

1. Ensure that you have prisma set up in your project. See the Prisma docs for setup.
2. Create a table for you logs e.g.

```
model Log {
  id    String @id @default(cuid())
  time  String
  error String
  site  String
  level String
}
```

3. Install winston-prisma:

```
$ npm install prisma-trasnport
$ yarn add prisma-transport
```

4. Usage:

```
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

```

5. Logging

```
logger.log('info', 'message', {});
```