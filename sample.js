/**
 * @module 'winston-pg-native'
 * @fileoverview Winston transport for logging into PostgreSQL
 * @license MIT
 * @author Andrei Tretyakov <andrei.tretyakov@gmail.com>
 * @author Jeffrey Yang <jeffrey.a.yang@gmail.com>
 */

const { stringify } = require("flatted/cjs");
const moment = require("moment");
const {
  native: { Pool },
} = require("pg");
const sql = require("sql");
const { Stream } = require("stream");
const Transport = require("winston-transport");

/**
 * Class for the Postgres transport object.
 * @class
 * @param {Object} options
 * @param {String} [options.level=info] - Level of messages that this transport
 * should log.
 * @param {Boolean} [options.silent=false] - Boolean flag indicating whether to
 * suppress output.
 * @param {String} options.conString - Postgres connection uri
 * @param {String} [options.tableName='winston_logs'] - The name of the table you
 * want to store log messages in.
 * @param {Array} [options.tableFields=['level', 'msg', 'meta']] - array of the table fields
 * @param {String} [options.label] - Label stored with entry object if defined.
 * @param {String} [options.name] - Transport instance identifier. Useful if you
 * need to create multiple Postgres transports.
 */
class Postgres extends Transport {
  constructor(options = {}) {
    super(options);
    //
    // Name this logger
    //
    this.name = options.name || "Postgres";
    //
    // Set the level from your options
    //
    this.level = options.level || "info";

    this.silent = options.silent || false;

    // legacy
    const tableConfig = options.tableConfig ? options.tableConfig : {};

    const tableName =
      tableConfig.tableName || options.tableName || "winston_logs";

    let tableFields = tableConfig.tableFields ||
      options.tableFields || [
        {
          name: "level",
          dataType: "character varying",
        },
        {
          name: "message",
          dataType: "character varying",
        },
        {
          name: "meta",
          dataType: "json",
        },
      ];

    tableFields =
      tableFields instanceof Array ? tableFields : tableFields.split(", ");

    tableFields.unshift({
      name: "timestamp",
      dataType: "timestamp without time zone",
    });

    this.table = sql.define({
      name: tableName,
      columns: tableFields,
    });

    //
    // Configure storage
    //
    if (!options.conString && !options.connectionString) {
      throw new Error("You have to define conString or connectionString");
    }

    const poolConfig = Object.assign(options.poolConfig || {}, {
      connectionString: options.conString || options.connectionString || "",
    });

    this.pool = new Pool(poolConfig);
  }

  /**
   * Core logging method exposed to Winston. Metadata is optional.
   * @param {string} level Level at which to log the message.
   * @param {string} message Message to log
   * @param {Object=} meta Metadata to log
   * @param {Function} callback Continuation to respond to when complete.
   */
  log(args, callback) {
    // const level = args.level;
    // const message = args.message;
    // const meta = args.meta;

    const { level, message, meta } = args;
    if (!callback) {
      callback = () => {};
    }

    const { pool, table } = this;
    let { sqlStatement } = this;

    if (sqlStatement) {
      sqlStatement = {
        text: sqlStatement,
        values: ["now()", level, message, stringify(meta)],
      };
    }

    if (this.silent) {
      callback(null, true);
      return null;
    }
    return pool.connect().then((client) =>
      client
        .query(
          sqlStatement ||
            table
              .insert(
                table.timestamp.value("NOW()"),
                table.level.value(level),
                table.message.value(message),
                table.meta.value(stringify(meta))
              )
              .toQuery()
        )
        .then(() => {
          client.release();
          this.emit("logged", args);
          callback(null, true);
          return null;
        })
        .catch((e) => {
          client.release();
          this.emit("error", e.stack);
          callback(e.stack);
          return null;
        })
    );
  }
}

module.exports = Postgres;
