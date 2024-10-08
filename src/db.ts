import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function initializeDB() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: 18425,
      connectTimeout: 60000,
    });

    console.log("Connected to MySQL");

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS schools (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address VARCHAR(255),
          latitude FLOAT,
          longitude FLOAT
      )
    `;
    await connection.query(createTableQuery);
    console.log("Schools table created successfully");
  } catch (err) {
    console.error("Error creating schools table:", err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDB().catch(console.error);
