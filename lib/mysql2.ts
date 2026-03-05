import mysql from 'mysql2/promise';

// Type for our connection cache
let connection: mysql.Connection | null = null;

// Use sslOptions if you are using aiven
// SSL configuration for Aiven (essential)
const sslOptions = {
  ca: process.env.DB_CERTIFICATE,
  rejectUnauthorized: true
};


const getDatabaseConnection = async (): Promise<mysql.Connection> => {
  try {
    if (connection) {
      // Verify the existing connection is still alive
      try {
        await connection.ping();
        return connection;
      } catch (error) {
        console.warn('Existing connection failed ping, creating new one');
        console.warn(error)
        connection = null; // Force new connection
      }
    }

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT!),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: sslOptions, // use it if you are using aiven
      connectTimeout: 5000, // 5 second timeout
      supportBigNumbers: true,
      bigNumberStrings: true
    });

    console.log('Successfully connected to MySQL database');
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    connection = null; // Ensure we don't reuse a failed connection
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Proper connection cleanup for application shutdown
export const closeDatabaseConnection = async (): Promise<void> => {
  if (connection) {
    try {
      await connection.end();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    } finally {
      connection = null;
    }
  }
};

export default getDatabaseConnection;