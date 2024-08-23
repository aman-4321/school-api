import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import * as turf from "@turf/turf";
import * as fs from "fs";

dotenv.config();

const caCertPath = "/etc/secrets/ca.pem";

const app = express();
app.use(express.json());
app.use(cors());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync(caCertPath),
  },
  port: 18425,
});

const isValidLatitude = (lat: number): boolean => lat >= -90 && lat <= 90;
const isValidLongitude = (lon: number): boolean => lon >= -180 && lon <= 180;

app.post("/addSchool", async (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ message: "Invalid name" });
  }
  if (typeof address !== "string" || address.trim() === "") {
    return res.status(400).json({ message: "Invalid address" });
  }
  if (typeof latitude !== "number" || !isValidLatitude(latitude)) {
    return res.status(400).json({ message: "Invalid latitude" });
  }
  if (typeof longitude !== "number" || !isValidLongitude(longitude)) {
    return res.status(400).json({ message: "Invalid longitude" });
  }

  try {
    const connection = await pool.getConnection();
    await connection.execute(
      "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)",
      [name, address, latitude, longitude],
    );
    connection.release();
    res.status(201).json({ message: "School added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding school" });
  }
});

app.get("/listSchools", async (req, res) => {
  const userLat = parseFloat(req.query.latitude as string);
  const userLon = parseFloat(req.query.longitude as string);

  if (isNaN(userLat) || !isValidLatitude(userLat)) {
    return res.status(400).json({ message: "Invalid latitude" });
  }
  if (isNaN(userLon) || !isValidLongitude(userLon)) {
    return res.status(400).json({ message: "Invalid longitude" });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT id, name, address, latitude, longitude FROM schools",
    );
    connection.release();

    const userLocation = turf.point([userLon, userLat]);

    const schools = (rows as any[]).map((school) => {
      const schoolLocation = turf.point([school.longitude, school.latitude]);
      const distance = turf.distance(userLocation, schoolLocation, {
        units: "kilometers",
      });
      return { ...school, distance };
    });

    schools.sort((a, b) => a.distance - b.distance);

    res.json(schools);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching schools" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
