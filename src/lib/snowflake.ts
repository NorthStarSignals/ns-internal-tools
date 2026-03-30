import snowflake from "snowflake-sdk";

let connection: snowflake.Connection | null = null;

export function getSnowflakeConnection(): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    if (connection) {
      resolve(connection);
      return;
    }

    const conn = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT!,
      username: process.env.SNOWFLAKE_USER!,
      password: process.env.SNOWFLAKE_PASSWORD!,
      database: process.env.SNOWFLAKE_DATABASE || "NORTH_STAR",
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
    });

    conn.connect((err, conn) => {
      if (err) {
        reject(err);
        return;
      }
      connection = conn;
      resolve(conn);
    });
  });
}

export function executeQuery(
  conn: snowflake.Connection,
  sql: string,
  binds?: snowflake.Binds
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds,
      complete: (err, _stmt, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      },
    });
  });
}
