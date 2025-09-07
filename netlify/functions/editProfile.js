const { MongoClient, ObjectId } = require("mongodb");
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
        "Access-Control-Allow-Methods": "PUT, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "PUT") {
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

    const { profileId, name, photo, links, categories } = JSON.parse(event.body);

    if (!profileId || !name || !photo || !links || !categories) {
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

    const updateData = {
      name,
      photo,
      links: Array.isArray(links) ? links : [links],
      categories: Array.isArray(categories) ? categories : [categories],
      updatedAt: new Date()
    };

    const result = await db.collection("profiles").updateOne(
      { _id: new ObjectId(profileId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { 
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Perfil no encontrado" })
      };
    }

    return { 
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: "Perfil actualizado correctamente" })
    };
  } catch (err) {
    console.error("Error en editProfile:", err);
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