const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

const client = new MongoClient(process.env.MONGO_URI);
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
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
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { 
        statusCode: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Falta token" })
      };
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "admin") {
      return { 
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "No autorizado" })
      };
    }

    const { name, photo, links, categories } = JSON.parse(event.body);

    if (!name || !photo || !links || !categories) {
      return { 
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Datos incompletos" })
      };
    }

    await client.connect();
    const db = client.db("miApp");

    const profile = {
      name,
      photo,
      links: Array.isArray(links) ? links : [links],
      categories: Array.isArray(categories) ? categories : [categories],
      createdAt: new Date()
    };

    await db.collection("profiles").insertOne(profile);

    return { 
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: "Perfil creado correctamente" })
    };
  } catch (err) {
    console.error("Error en addProfile:", err);
    return { 
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Error interno del servidor" })
    };
  } finally {
    await client.close();
  }
};