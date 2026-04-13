document.addEventListener("DOMContentLoaded", function() {

  // 1. Off-Canvas Sidebar
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('mobileSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (toggleBtn && sidebar && overlay) {
    toggleBtn.addEventListener('click', function() {
      sidebar.classList.add('show');
      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    });
  }

  // 2. Global Chart Entrance Animation
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('chart-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.chart-wrapper').forEach(function(el) {
    observer.observe(el);
  });
  document.querySelectorAll('.card-custom').forEach(function(card, i) {
    card.style.animationDelay = (i * 0.07) + 's';
  });

  // 3. Notification Bell: Low Stock Alerts
  const bell = document.getElementById('notifBell');
  const panel = document.getElementById('notifPanel');
  const badge = document.getElementById('notifBadge');
  const list = document.getElementById('notifList');
  const count = document.getElementById('notifCount');
  
  if (bell && panel) {
    bell.addEventListener('click', function(e) {
      e.stopPropagation();
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        bell.classList.remove('notif-pulse');
      }
    });
    document.addEventListener('click', function(e) {
      if (!panel.contains(e.target) && e.target !== bell) {
        panel.classList.remove('open');
      }
    });

    function loadAlerts() {
      fetch('/api/low-stock')
        .then(r => r.json())
        .then(items => {
          if (!items || items.length === 0) {
            badge.classList.add('d-none');
            count.textContent = '0 alertas';
            list.innerHTML = '<div class="notif-empty"><i class="fa-solid fa-check-circle me-2 text-success"></i>Todo en orden — no hay alertas</div>';
            return;
          }
          badge.textContent = items.length;
          badge.classList.remove('d-none');
          count.textContent = items.length + (items.length === 1 ? ' alerta' : ' alertas');
          bell.classList.add('notif-pulse');
          let html = '';
          items.forEach(p => {
            let level = p.stock <= 2 ? 'critical' : p.stock <= 5 ? 'warning' : 'low';
            let icon = level === 'critical' ? 'fa-circle-xmark text-danger'
                     : level === 'warning' ? 'fa-triangle-exclamation text-warning'
                     : 'fa-circle-info text-info';
            html += '<a href="/productos/cambios?id=' + p.id + '" class="notif-item notif-' + level + '">'
                 +    '<div class="notif-item-icon"><i class="fa-solid ' + icon + '"></i></div>'
                 +    '<div class="notif-item-body">'
                 +      '<div class="notif-item-title">' + p.nombre + '</div>'
                 +      '<div class="notif-item-detail">Quedan <strong>' + p.stock + '</strong> unidades</div>'
                 +    '</div>'
                 +    '<div class="notif-item-stock">' + p.stock + '</div>'
                 +  '</a>';
          });
          list.innerHTML = html;
        }).catch(err => console.error('Notif error:', err));
    }
    loadAlerts();
    setInterval(loadAlerts, 60000);
  }

  // 4. Ventas: Toggle Secion Facturacion
  const toggleFactura = document.getElementById('requiereFactura');
  const seccionFacturacion = document.getElementById('seccionFacturacion');
  if (toggleFactura && seccionFacturacion) {
    toggleFactura.addEventListener('change', function() {
      if(this.checked) {
        seccionFacturacion.style.opacity = '1';
        seccionFacturacion.style.pointerEvents = 'auto';
      } else {
        seccionFacturacion.style.opacity = '0.3';
        seccionFacturacion.style.pointerEvents = 'none';
      }
    });
  }

  // 5. Autocalculate Totals (Cotizaciones / Ventas)
  const selectProducto = document.getElementById('producto');
  const inputMonto = document.getElementById('monto');
  const inputCantidad = document.getElementById('cantidad');
  function actualizarTotal() {
    if(!selectProducto || !inputMonto || !inputCantidad) return;
    const selectedOption = selectProducto.options[selectProducto.selectedIndex];
    const precio = selectedOption ? selectedOption.dataset.precio : null;
    const cantidad = inputCantidad.value;
    if (precio && cantidad) {
      inputMonto.value = (precio * cantidad).toFixed(2);
    } else {
      inputMonto.value = '';
    }
  }
  if(selectProducto) selectProducto.addEventListener('change', actualizarTotal);
  if(inputCantidad) inputCantidad.addEventListener('input', actualizarTotal);


  // 6. Generic Form Validation
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      let errors = [];

      // Validaciones Clientes / Generales
      const nombre = form.querySelector('[name="nombre"]');
      const email = form.querySelector('[name="email"]');
      const telefono = form.querySelector('[name="telefono"]');
      const rfc = form.querySelector('[name="rfc"]');
      const cp = form.querySelector('[name="cp"]');
      const empresa = form.querySelector('[name="empresa"]');
      const contacto = form.querySelector('[name="contacto"]');
      
      // Productos
      const proveedor = form.querySelector('[name="proveedor"]');
      const stock = form.querySelector('[name="stock"]');
      const precio = form.querySelector('[name="precio"]');

      // Cotizaciones / Ventas
      const clienteId = form.querySelector('[name="cliente_id"]');
      const productoId = form.querySelector('[name="producto_id"]');
      const cantidad = form.querySelector('[name="cantidad"]');
      const vigencia = form.querySelector('[name="vigencia_dias"]');

      // Empleados
      const nombre_completo = form.querySelector('[name="nombre_completo"]');
      const usuario = form.querySelector('[name="usuario"]');
      const password = form.querySelector('[name="password"]');
      const salario = form.querySelector('[name="salario"]');
      const rol = form.querySelector('[name="rol"]');

      // Validar según lo que exista en el form actual
      if (nombre && !nombre.value.trim() && form.action.includes('clientes')) errors.push('El nombre comercial es obligatorio');
      if (nombre && !nombre.value.trim() && form.action.includes('productos')) errors.push('El nombre del producto es obligatorio');
      
      if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        errors.push('El correo electrónico no tiene un formato válido');
      } else if (email && !email.value.trim() && form.action.includes('clientes')) {
        errors.push('El correo electrónico es obligatorio');
      }

      if (telefono && telefono.value.trim()) {
        const digits = telefono.value.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) errors.push('El teléfono debe tener entre 7 y 15 dígitos');
      }

      if (rfc && rfc.value.trim() && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(rfc.value.trim())) {
        errors.push('El RFC no tiene un formato válido (ej: XAXX010101000)');
      }

      if (cp && cp.value.trim() && !/^\d{5}$/.test(cp.value.trim())) {
        errors.push('El código postal debe ser de 5 dígitos');
      }

      if (empresa && !empresa.value.trim()) errors.push('La razón social es obligatoria');
      if (contacto && !contacto.value.trim()) errors.push('El nombre del contacto es obligatorio');

      if (proveedor && !proveedor.value) errors.push('Debes seleccionar un proveedor');
      if (stock && (stock.value === '' || Number(stock.value) < 0 || !Number.isInteger(Number(stock.value)))) errors.push('El stock debe ser un número entero mayor o igual a 0');
      if (precio && (precio.value === '' || Number(precio.value) <= 0)) errors.push('El precio debe ser mayor a 0');

      if (clienteId && !clienteId.value) errors.push('Debes seleccionar un cliente');
      if (productoId && !productoId.value) errors.push('Debes seleccionar un producto');
      if (cantidad && (cantidad.value === '' || Number(cantidad.value) < 1 || !Number.isInteger(Number(cantidad.value)))) errors.push('La cantidad debe ser un número entero mayor o igual a 1');
      if (vigencia && (vigencia.value === '' || Number(vigencia.value) < 1 || !Number.isInteger(Number(vigencia.value)))) errors.push('La vigencia debe ser al menos 1 día');

      if (nombre_completo && !nombre_completo.value.trim()) errors.push('El nombre completo es obligatorio');
      if (usuario && usuario.value.trim().length < 3) errors.push('El usuario debe tener al menos 3 caracteres');
      if (password && password.value.length > 0 && password.value.length < 4) errors.push('La contraseña debe tener al menos 4 caracteres');
      if (password && form.action.includes('add') && password.value.length < 4) errors.push('La contraseña debe tener al menos 4 caracteres');
      if (rol && !rol.value) errors.push('Debes seleccionar un rol');
      if (salario && salario.value && Number(salario.value) < 0) errors.push('El salario no puede ser negativo');

      if (errors.length > 0) {
        e.preventDefault();
        let existingAlert = form.querySelector('.validation-alert');
        if (existingAlert) existingAlert.remove();
        const alertDiv = document.createElement('div');
        alertDiv.className = 'validation-alert alert alert-danger';
        alertDiv.innerHTML = '<strong>Errores:</strong><ul>' + errors.map(er => '<li>' + er + '</li>').join('') + '</ul>';
        if (form.parentElement.classList.contains('card-body') || form.parentElement.classList.contains('p-4')) {
          form.parentElement.prepend(alertDiv);
        } else {
          form.prepend(alertDiv);
        }
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    });
  });

  // 7. Descargar PDF (Unificada)
  window.descargarPDF = function(filename) {
    const element = document.getElementById('printableArea');
    if(!element) return;
    
    // Asignar el PDF global (cargado via CDN en pug)
    if(typeof html2pdf === 'undefined') {
      console.error("html2pdf no está cargado");
      return;
    }

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     filename || 'Documento.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        scrollY: 0,
        onclone: (doc) => {
          const pdfView = doc.getElementById('printableArea');
          if(!pdfView) return;
          const allElements = pdfView.getElementsByTagName('*');
          for (let el of allElements) {
            if (!el.classList.contains('badge') && !el.classList.contains('no-print')) {
              el.style.color = '#000000';
              el.style.opacity = '1';
            }
          }
          const tables = pdfView.getElementsByTagName('table');
          for (let table of tables) {
            table.style.borderColor = '#000000';
          }
        }
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }

  // 8. Gráficas y Métricas (Dashboard)
  // Dashboard principal usa fetch, ventas y productos usan window variables
  if(document.getElementById('ventasChart') && window.location.pathname === '/dashboard') {
    fetch('/api/metricas')
      .then(res => res.json())
      .then(data => {
        const colorDarkTeal = '#09637E';
        const colorTeal = '#088395';
        const colorLightTeal = '#7AB2B2';
        
        const ctxVentas = document.getElementById('ventasChart').getContext('2d');
        new Chart(ctxVentas, {
          type: 'line',
          data: {
            labels: data.ventasPorDia.map(v => new Date(v.fecha).toLocaleDateString()),
            datasets: [{
              label: 'Ventas Diarias ($)',
              data: data.ventasPorDia.map(v => v.total),
              borderColor: colorTeal,
              backgroundColor: 'rgba(8, 131, 149, 0.1)',
              borderWidth: 2,
              pointBackgroundColor: colorDarkTeal,
              fill: true,
              tension: 0.4
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } } }
        });

        const ctxProductos = document.getElementById('productosChart').getContext('2d');
        new Chart(ctxProductos, {
          type: 'doughnut',
          data: {
            labels: data.topProductos.map(p => p.producto),
            datasets: [{
              label: 'Cantidad Vendida',
              data: data.topProductos.map(p => p.cantidad),
              backgroundColor: [colorDarkTeal, colorTeal, colorLightTeal, '#5c9898', '#387383'],
              borderWidth: 0
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, animation: { animateRotate: true, animateScale: true }, plugins: { legend: { position: 'right' } } }
        });
      })
      .catch(err => console.error("Error cargando métricas:", err));
  }

  // Gráfica Ventas
  if(document.getElementById('salesChart')) {
    const labels = window.__chartLabels || [];
    const values = window.__chartValues || [];
    new Chart(document.getElementById('salesChart').getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ingresos Diarios ($)',
          data: values,
          borderColor: '#20c997',
          backgroundColor: 'rgba(32, 201, 151, 0.2)',
          borderWidth: 2,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#05445e',
          pointBorderWidth: 2,
          pointRadius: 4,
          fill: true,
          tension: 0.4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
    });
  }

  // Gráfica Inventario
  if(document.getElementById('inventoryChart')) {
    const data = window.__inventoryData || [0, 0, 0];
    new Chart(document.getElementById('inventoryChart').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Normal (≥10)', 'Bajo Stock (<10)', 'Agotado (0)'],
        datasets: [{ data: data, backgroundColor: ['#198754', '#ffc107', '#dc3545'], borderWidth: 0, hoverOffset: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } } } }
    });
  }

  // 9. Buscador Proveedores
  const searchInput = document.getElementById('searchProveedor');
  if (searchInput) {
    function filtrarProveedores() {
      const termino = searchInput.value.toLowerCase().trim();
      const filas = document.querySelectorAll('.fila-proveedor');
      filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        fila.style.display = texto.includes(termino) ? '' : 'none';
      });
    }
    searchInput.addEventListener('input', filtrarProveedores);
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); filtrarProveedores(); }
    });
  }
});

// Modales globales para proveedores/productos
window.verProductos = function(provId, provNombre) {
  const modal = new bootstrap.Modal(document.getElementById('modalProductos'));
  document.getElementById('modalProductosLabel').innerHTML = '<i class="fa-solid fa-box-open me-2"></i>Productos de: ' + provNombre;
  document.getElementById('modalProductosBody').innerHTML = '<div class="text-center p-4"><div class="spinner-border text-muted" role="status"></div><p class="text-muted mt-2">Cargando productos...</p></div>';
  modal.show();

  fetch('/api/proveedor-productos?id=' + provId)
    .then(r => r.json())
    .then(productos => {
      const body = document.getElementById('modalProductosBody');
      if (!productos || productos.length === 0) {
        body.innerHTML = '<div class="text-center p-5"><i class="fa-solid fa-box-open fa-3x text-muted mb-3" style="opacity:0.3;"></i><p class="text-muted mb-0">Este proveedor aún no tiene productos registrados.</p><a href="/productos/altas" class="btn btn-primary-custom btn-sm mt-3"><i class="fa-solid fa-plus me-1"></i>Agregar Producto</a></div>';
        return;
      }
      let html = '<div class="table-responsive"><table class="table table-custom mb-0 align-middle">';
      html += '<thead><tr><th>ID</th><th>Producto</th><th>Stock</th><th>Precio</th><th>Acción</th></tr></thead><tbody>';
      productos.forEach(p => {
        let stockClass = p.stock < 10 ? 'bg-danger' : 'bg-success';
        let stockLabel = p.stock < 10 ? p.stock + ' (Bajo)' : p.stock;
        html += `<tr><td class="text-muted">#${p.id}</td><td class="fw-bold">${p.nombre}</td><td><span class="badge ${stockClass}">${stockLabel}</span></td><td class="fw-bold" style="color: var(--color-teal);">$${Number(p.precio).toFixed(2)}</td><td><a class="btn btn-sm btn-warning" href="/productos/cambios?id=${p.id}" title="Editar"><i class="fa-solid fa-pencil"></i></a></td></tr>`;
      });
      html += '</tbody></table></div>';
      body.innerHTML = html;
    })
    .catch(err => {
      document.getElementById('modalProductosBody').innerHTML = '<div class="text-center p-4 text-danger"><i class="fa-solid fa-circle-xmark fa-2x mb-2"></i><p>Error al cargar productos</p></div>';
    });
}
window.confirmarEliminar = function(provId, provNombre) {
  document.getElementById('nombreProvEliminar').textContent = provNombre;
  document.getElementById('formEliminar').action = '/productos/proveedor-delete/' + provId;
  const modal = new bootstrap.Modal(document.getElementById('modalEliminar'));
  modal.show();
}
window.confirmarEliminarProd = function(prodId, prodNombre) {
  document.getElementById('nombreProdEliminar').textContent = prodNombre;
  document.getElementById('formEliminarProd').action = '/productos/delete/' + prodId;
  const modal = new bootstrap.Modal(document.getElementById('modalEliminarProd'));
  modal.show();
}

// Facturas
window.cambiarEstado = function(id, nuevoEstado) {
  fetch('/ventas/facturas/cambiar-estado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id, estado: nuevoEstado })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      let badge = document.getElementById('badge-' + id);
      if (badge) {
        badge.textContent = nuevoEstado;
        badge.className = 'badge ' + (nuevoEstado === 'Pagada' ? 'bg-success' : nuevoEstado === 'Vencida' ? 'bg-danger' : 'bg-warning text-dark');
      }
      let row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) row.setAttribute('data-estado', nuevoEstado);
      window.actualizarContadores();
      window.mostrarToast('✓ Estado actualizado a "' + nuevoEstado + '"', nuevoEstado);
    } else {
      window.mostrarToast('✗ Error: ' + (data.error || 'No se pudo actualizar'), 'error');
    }
  })
  .catch(err => window.mostrarToast('✗ Error de conexión', 'error'));
}
window.filtrarFacturas = function(estado, btn) {
  document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#facturasBody tr[data-estado]').forEach(row => {
    row.style.display = (estado === 'todas' || row.getAttribute('data-estado') === estado) ? '' : 'none';
  });
}
window.actualizarContadores = function() {
  const rows = document.querySelectorAll('#facturasBody tr[data-estado]');
  let counts = { total: 0, Pendiente: 0, Pagada: 0, Vencida: 0 };
  rows.forEach(row => {
    counts.total++;
    let est = row.getAttribute('data-estado');
    if (counts[est] !== undefined) counts[est]++;
  });
  if(document.getElementById('countTotal')) document.getElementById('countTotal').textContent = counts.total;
  if(document.getElementById('countPendiente')) document.getElementById('countPendiente').textContent = counts.Pendiente;
  if(document.getElementById('countPagada')) document.getElementById('countPagada').textContent = counts.Pagada;
  if(document.getElementById('countVencida')) document.getElementById('countVencida').textContent = counts.Vencida;
}
window.mostrarToast = function(msg, tipo) {
  const toast = document.getElementById('statusToast');
  if (!toast) return;
  toast.textContent = msg;
  if (tipo === 'Pagada') toast.style.background = 'linear-gradient(135deg, #198754, #157347)';
  else if (tipo === 'Vencida' || tipo === 'error') toast.style.background = 'linear-gradient(135deg, #dc3545, #b02a37)';
  else toast.style.background = 'linear-gradient(135deg, #ffc107, #e0a800)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
