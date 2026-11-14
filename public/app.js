const API_URL = '/api/products';
const tableBody = document.getElementById('productsTableBody');
const modal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');

document.addEventListener('DOMContentLoaded', fetchProducts);

async function fetchProducts() {
    try {
        const res = await fetch(API_URL);
        const products = await res.json();
        tableBody.innerHTML = '';
        
        if (products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No hay productos registrados.</td></tr>`;
            return;
        }

        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${p.image || 'https://via.placeholder.com/40'}" class="thumb" onclick="openImageModal('${p.image || ''}')" style="cursor: pointer;" title="Haz clic para ampliar"></td>
                <td>${p.barcode || 'N/A'}</td>
                <td><strong>${p.name}</strong></td>
                <td>$${Number(p.price_out).toFixed(2)}</td>
                <td>${p.inventary_min}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="openModal(${p.id}, 'view')">Ver</button>
                    <button class="btn btn-success btn-sm" onclick="openModal(${p.id}, 'edit')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error al cargar productos:', err);
    }
}

document.getElementById('btnOpenCreate').onclick = () => openModal(null, 'create');
document.getElementById('btnCloseModal').onclick = () => modal.style.display = 'none';
document.getElementById('btnClose').onclick = () => modal.style.display = 'none';

// --- INTEGRACIÓN OPEN FOOD FACTS (BÚSQUEDA POR CÓDIGO DE BARRAS) ---
document.getElementById('btnFetchOpenFood').onclick = async () => {
    const barcodeInput = document.getElementById('barcode');
    const barcode = barcodeInput.value.trim();

    if (!barcode) {
        alert('Por favor, ingresa un código de barras primero.');
        return;
    }

    const btn = document.getElementById('btnFetchOpenFood');
    btn.innerText = 'Buscando...';
    btn.disabled = true;

    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const prod = data.product;
            
            // Autocompletar campos del formulario con los datos de la nube
            document.getElementById('name').value = prod.product_name || prod.product_name_es || '';
            document.getElementById('image').value = prod.image_front_url || prod.image_url || '';
            document.getElementById('presentation').value = prod.quantity || '';
            document.getElementById('description').value = prod.ingredients_text || prod.generic_name || '';
            
            alert('¡Producto encontrado y cargado exitosamente desde Open Food Facts!');
        } else {
            alert('No se encontró ningún producto con ese código de barras en la base de datos global.');
        }
    } catch (error) {
        console.error('Error al consultar Open Food Facts:', error);
        alert('Ocurrió un error al conectar con el servicio de Open Food Facts.');
    } finally {
        btn.innerText = '🔍 Buscar en la Nube';
        btn.disabled = false;
    }
};

async function openModal(id = null, mode = 'create') {
    modal.style.display = 'flex';
    productForm.reset();
    document.getElementById('productId').value = '';
    const inputs = productForm.querySelectorAll('input, textarea');
    inputs.forEach(i => i.disabled = false);
    document.getElementById('btnSave').style.display = 'inline-block';
    document.getElementById('btnFetchOpenFood').style.display = 'inline-block';

    if (mode === 'create') {
        document.getElementById('modalTitle').innerText = 'Nuevo Producto';
    } else {
        const res = await fetch(`${API_URL}/${id}`);
        const p = await res.json();
        document.getElementById('productId').value = p.id;
        document.getElementById('name').value = p.name;
        document.getElementById('barcode').value = p.barcode || '';
        document.getElementById('price_in').value = p.price_in || '';
        document.getElementById('price_out').value = p.price_out || '';
        document.getElementById('inventary_min').value = p.inventary_min || 10;
        document.getElementById('category_id').value = p.category_id || '';
        document.getElementById('unit').value = p.unit || '';
        document.getElementById('presentation').value = p.presentation || '';
        document.getElementById('image').value = p.image || '';
        document.getElementById('description').value = p.description || '';

        if (mode === 'view') {
            document.getElementById('modalTitle').innerText = 'Detalle de Producto';
            inputs.forEach(i => i.disabled = true);
            document.getElementById('btnSave').style.display = 'none';
            document.getElementById('btnFetchOpenFood').style.display = 'none';
        } else {
            document.getElementById('modalTitle').innerText = 'Editar Producto';
        }
    }
}

productForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const body = {
        name: document.getElementById('name').value,
        barcode: document.getElementById('barcode').value,
        price_in: parseFloat(document.getElementById('price_in').value) || 0,
        price_out: parseFloat(document.getElementById('price_out').value) || 0,
        inventary_min: parseInt(document.getElementById('inventary_min').value) || 10,
        category_id: document.getElementById('category_id').value,
        unit: document.getElementById('unit').value,
        presentation: document.getElementById('presentation').value,
        image: document.getElementById('image').value,
        description: document.getElementById('description').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        modal.style.display = 'none';
        fetchProducts();
    } else {
        alert('Error al guardar el producto');
    }
};

async function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProducts();
    else alert('Error al eliminar');
}

// --- CONTROL DE MODAL DE ZOOM DE IMAGEN ---
const imageModal = document.getElementById('imageModal');
const modalZoomImg = document.getElementById('modalZoomImg');
const btnCloseImageModal = document.getElementById('btnCloseImageModal');

function openImageModal(url) {
    if (!url) {
        alert('Este producto no cuenta con una imagen registrada.');
        return;
    }
    modalZoomImg.src = url;
    imageModal.style.display = 'flex';
}

btnCloseImageModal.onclick = () => {
    imageModal.style.display = 'none';
};

// Cerrar el modal si hacen clic fuera de la imagen
window.addEventListener('click', (event) => {
    if (event.target === imageModal) {
        imageModal.style.display = 'none';
    }
});