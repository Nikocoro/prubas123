const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const client = new MongoClient(process.env.MONGO_URI);
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
  // Manejar CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Método no permitido" })
    };
  }

  try {
    console.log("Login attempt - Body:", event.body);
    
    // Verificar variables de entorno
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI no está definida");
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Error de configuración del servidor" })
      };
    }

    if (!JWT_SECRET) {
      console.error("JWT_SECRET no está definida");
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Error de configuración del servidor" })
      };
    }

    const { username, password } = JSON.parse(event.body);
    console.log("Login attempt for username:", username);

    if (!username || !password) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Usuario y contraseña requeridos" })
      };
    }

    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db("miApp");
    const user = await db.collection("users").findOne({ username });
    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      return { 
        statusCode: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Credenciales inválidas" })
      };
    }

    const valid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", valid);
    
    if (!valid) {
      return { 
        statusCode: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Credenciales inválidas" })
      };
    }

    const token = jwt.sign(
      { username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    console.log("Login successful for:", username);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token, role: user.role })
    };
  } catch (err) {
    console.error("Error en login:", err);
    return { 
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Error interno del servidor: " + err.message })
    };
  } finally {
    try {
      await client.close();
    } catch (e) {
      console.error("Error closing connection:", e);
    }
  }
};