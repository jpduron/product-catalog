const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos de Aiven:', err.message);
    } else {
        console.log('✅ Conectado exitosamente a la base de datos MySQL en Aiven');
        connection.release();
    }
});

// --- API REST CRUD PARA PRODUCTS ---

// 1. Obtener todos los productos
app.get('/api/products', (req, res) => {
    const query = 'SELECT * FROM products ORDER BY created_at DESC';
    pool.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener los productos' });
        res.json(results);
    });
});

// 2. Obtener un producto por ID
app.get('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM products WHERE id = ?';
    pool.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al consultar el producto' });
        if (results.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(results[0]);
    });
});

// 3. Crear un nuevo producto
app.post('/api/products', (req, res) => {
    const { 
        image, barcode, name, description, inventary_min, 
        price_in, price_out, unit, presentation, category_id, is_active 
    } = req.body;

    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const query = `
        INSERT INTO products 
        (image, barcode, name, description, inventary_min, price_in, price_out, unit, presentation, category_id, is_active, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const values = [
        image, barcode, name, description, 
        inventary_min !== undefined ? inventary_min : 10, 
        price_in || 0, price_out || 0, unit, presentation, 
        category_id, is_active !== undefined ? is_active : 1
    ];

    pool.query(query, values, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al crear el producto' });
        }
        res.status(201).json({ id: results.insertId, message: 'Producto creado exitosamente' });
    });
});

// 4. Actualizar un producto
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { 
        image, barcode, name, description, inventary_min, 
        price_in, price_out, unit, presentation, category_id, is_active 
    } = req.body;

    const query = `
        UPDATE products SET 
        image = ?, barcode = ?, name = ?, description = ?, inventary_min = ?, 
        price_in = ?, price_out = ?, unit = ?, presentation = ?, category_id = ?, is_active = ? 
        WHERE id = ?
    `;

    const values = [
        image, barcode, name, description, inventary_min, 
        price_in, price_out, unit, presentation, category_id, is_active, id
    ];

    pool.query(query, values, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar el producto' });
        if (results.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto actualizado correctamente' });
    });
});

// 5. Eliminar un producto
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM products WHERE id = ?';
    pool.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar el producto' });
        if (results.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto eliminado correctamente' });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});