/* app.js
   Implementación del controlador de la interfaz (App) y utilidades UI.
   Se siguen buenas prácticas: separación de responsabilidades, funciones pequeñas,
   sincronización con localStorage y comentarios paso a paso.
*/

/* =====================
   PASO 1: Cargar datos desde localStorage
   ===================== */
let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
let usuarioActivo = null; // instancia de Cliente (clase) cuando el usuario inicia sesión
let intentos = 0;
const MAX_INTENTOS = 3;

/* =====================
   UTILIDADES: serializar y reconstruir usuarios
   - serializeCliente: convierte una instancia Cliente -> objeto simple (para almacenar)
   - reconstruirUsuario: convierte objeto simple -> instancias de clase
   ===================== */
function serializeCliente(cliente) {
  return {
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    direccion: cliente.direccion,
    email: cliente.email,
    telefono: cliente.telefono,
    numeroIdentificacion: cliente.numeroIdentificacion,
    usuario: cliente.usuario,
    contrasena: cliente.contrasena,
    cuentas: cliente.cuentas.map(c => ({
      numeroCuenta: c.numeroCuenta,
      saldo: c.saldo,
      movimientos: c.movimientos || []
    }))
  };
}

function reconstruirUsuario(obj) {
  // Crear instancia Cliente con los atributos completos
  const cliente = new __Bank.Cliente(
    obj.nombre, obj.apellido, obj.email, obj.telefono, obj.direccion, obj.numeroIdentificacion, obj.usuario, obj.contrasena
  );

  // Reconstruir cuentas (si existen)
  (obj.cuentas || []).forEach(c => {
    let cuenta;
    if (String(c.numeroCuenta).startsWith('AH-')) {
      cuenta = new __Bank.CuentaAhorros(c.numeroCuenta, c.saldo || 0);
    } else {
      cuenta = new __Bank.CuentaCorriente(c.numeroCuenta, c.saldo || 0);
    }
    cuenta.movimientos = c.movimientos || [];
    cliente.agregarCuenta(cuenta);
  });

  return cliente;
}

/* =====================
   SINCRONIZACIÓN: actualizar usuarios en localStorage
   - Busca el usuario por nombre de usuario y reemplaza su representación
   ===================== */
function syncUsuarioActivoToStorage() {
  const serial = serializeCliente(usuarioActivo);
  const idx = usuarios.findIndex(u => u.usuario === usuarioActivo.usuario);
  if (idx >= 0) {
    usuarios[idx] = serial;
  } else {
    usuarios.push(serial);
  }
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
}

/* =====================
   Módulo UI: funciones encargadas únicamente de manipular el DOM
   ===================== */
const UI = {
  // Mostrar formulario de registro en la misma pantalla
  mostrarRegistro() {
    document.getElementById('formLogin').classList.add('hidden');
    document.getElementById('formRegister').classList.remove('hidden');
    // limpiar mensajes
    document.getElementById('mensajeRegistro').innerText = '';
  },

  // Mostrar formulario de login
  mostrarLogin() {
    document.getElementById('formRegister').classList.add('hidden');
    document.getElementById('formLogin').classList.remove('hidden');
    document.getElementById('mensajeLogin').innerText = '';
  },

  // Mensajes de estado en UI
  mostrarMensaje(idElemento, texto, tipo = 'error') {
    const msg = document.getElementById(idElemento);
    msg.style.color = tipo === 'error' ? '#ff6b6b' : '#a5d6a7';
    msg.innerText = texto;
  },

  // Mostrar panel de acción (depósito, retiro, transferencia).
  // Nota: la cuenta origen se toma del selector 'cuentaActivaSelect' ubicado en el sidebar.
  mostrarAccion(tipo) {
    const panel = document.getElementById('panelAccion');
    panel.innerHTML = `
      <label>Monto</label>
      <input type="number" id="monto" placeholder="Monto">
      ${tipo === 'transferencia' ? '<label>Cuenta destino</label><input type="text" id="destino" placeholder="Número de cuenta destino">' : ''}
      <div style="margin-top:8px">
        <button id="confirmBtn" class="btn">Confirmar</button>
        <button id="cancelBtn" class="btn-secondary">Cancelar</button>
      </div>
    `;

    // Eventos para los botones del panel
    document.getElementById('cancelBtn').addEventListener('click', () => { panel.innerHTML = ''; });
    document.getElementById('confirmBtn').addEventListener('click', () => App.ejecutarAccion(tipo));
  }
};

/* =====================
   Módulo App: lógica de la aplicación (manejo de eventos y operaciones)
   ===================== */
const App = {
  // Inicialización: asignar listeners y preparar UI
  init() {
    // Limpiar campos de login al cargar (el usuario solicitó: "al ingresar el usuario no debe de tener ningun valor")
    const usuarioLogin = document.getElementById('usuarioLogin');
    const contrasenaLogin = document.getElementById('contrasenaLogin');
    if (usuarioLogin) usuarioLogin.value = '';
    if (contrasenaLogin) contrasenaLogin.value = '';

    // Formularios de index (login/registro)
    const formLogin = document.getElementById('formLogin');
    if (formLogin) formLogin.addEventListener('submit', e => { e.preventDefault(); this.login(); });

    const formRegister = document.getElementById('formRegister');
    if (formRegister) formRegister.addEventListener('submit', e => { e.preventDefault(); this.registrarUsuario(); });

    // Dashboard: salir y cargar sesión si existe
    const  salirBtn = document.getElementById('btnSalir')
    salirBtn.addEventListener('click', () => {
      usuarioActivo = null;
      sessionStorage.removeItem('usuarioActivo');
      window.location.href = 'index.html';  
    })
    const sttored = sessionStorage.getItem('usuarioActivo');
    if (sttored) {
      usuarioActivo = reconstruirUsuario(JSON.parse(sttored));
      this.actualizarUI();
    }else{
      window.location.href = 'index.html';
    }
  },

  /* Registro de usuario desde formulario (sin prompts)
     Campos requeridos: nombre, apellido, direccion, numeroIdentificacion, usuario, contrasena
     Selección de cuentas: tipoAhorros (checkbox), tipoCorriente (checkbox) -> puede seleccionar uno o ambos
  */
  registrarUsuario() {
    // Leer campos
    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const correo = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const numeroIdentificacion = document.getElementById('numeroIdentificacion').value.trim();
    const usuario = document.getElementById('usuarioNuevo').value.trim();
    const contrasena = document.getElementById('contrasenaNueva').value.trim();
    const confirmarContrasena = document.getElementById('confirmarContrasena').value.trim();
    const tipoAhorros = document.getElementById('tipoAhorros').checked;
    const tipoCorriente = document.getElementById('tipoCorriente').checked;

    // Validaciones básicas
    if (!nombre || !apellido || !correo || !telefono || !direccion || !numeroIdentificacion || !usuario || !contrasena) {
      UI.mostrarMensaje('mensajeRegistro', 'Complete todos los campos', 'error');
      return;
    }

    if (contrasena !== confirmarContrasena) {
      UI.mostrarMensaje('mensajeRegistro', 'Las contraseñas no coinciden', 'error');
      return;
    }

    if (!tipoAhorros && !tipoCorriente) {
      UI.mostrarMensaje('mensajeRegistro', 'Seleccione al menos un tipo de cuenta (Ahorros o Corriente)', 'error');
      return;
    }

    // Verificar unicidad del usuario
    if (usuarios.find(u => u.usuario === usuario)) {
      UI.mostrarMensaje('mensajeRegistro', '⚠️ Usuario ya existe', 'error');
      return;
    }

    // Crear cliente (instancia)
    const cliente = new __Bank.Cliente(nombre, apellido, direccion, correo, telefono, numeroIdentificacion, usuario, contrasena);

    // Crear cuentas según selección
    const unique = () => Math.floor(Math.random()*9000 + 1000); // sufijo para evitar choques de número
    if (tipoAhorros) {
      cliente.agregarCuenta(new __Bank.CuentaAhorros('AH-' + Date.now() + '-' + unique(), 0));
    }
    if (tipoCorriente) {
      cliente.agregarCuenta(new __Bank.CuentaCorriente('CC-' + Date.now() + '-' + unique(), 0));
    }

    // Guardar en localStorage como objeto simple
    usuarios.push(serializeCliente(cliente));
    localStorage.setItem('usuarios', JSON.stringify(usuarios));

    UI.mostrarMensaje('mensajeRegistro', '✅ Usuario registrado con éxito. Ahora inicia sesión.', 'ok');

    // Limpiar formulario y volver al login
    setTimeout(() => {
      // resetear campos
      document.getElementById('formRegister').reset();
      UI.mostrarLogin();
    }, 1200);
  },

  /* Login: buscar usuario en localStorage (usuarios es arreglo de objetos simples)
     Al iniciar sesión se reconstruye la instancia Cliente y se guarda en sessionStorage
  */
  login() {
    const user = document.getElementById('usuarioLogin').value.trim();
    const pass = document.getElementById('contrasenaLogin').value;
    const found = usuarios.find(u => u.usuario === user && u.contrasena === pass);
    if (found) {
      usuarioActivo = reconstruirUsuario(found);
      // Guardar sesión (serializada) y redirigir al dashboard
      sessionStorage.setItem('usuarioActivo', JSON.stringify(serializeCliente(usuarioActivo)));
      window.location.href = 'dashboard.html';
    }else if(!found){
      alert("Usuario no encontrado por favor registrese");
      window.location.href = 'index.html';
    }else {
      intentos++;
      UI.mostrarMensaje('mensajeLogin', `❌ Credenciales inválidas. Intentos: ${intentos}/${MAX_INTENTOS}`, 'error');
      if (intentos >= MAX_INTENTOS) UI.mostrarMensaje('mensajeLogin', '🚫 Has excedido los intentos permitidos.', 'error');
    }
  },

  /* Actualiza la interfaz del dashboard: nombre, listado de cuentas y saldo del account seleccionado */
  actualizarUI() {
    document.getElementById('userName').innerText = `${usuarioActivo.nombre} ${usuarioActivo.apellido}`;
    // Poblar selector de cuentas
    const select = document.getElementById('cuentaActivaSelect');
    select.innerHTML = usuarioActivo.cuentas.map((c, i) => `<option value="${i}">${c.numeroCuenta} — $${c.saldo}</option>`).join('');
    // Mostrar primera cuenta por defecto
    select.selectedIndex = 0;
    // actualizar número de cuenta visible
    document.getElementById('accountNumber').innerText = `Cuenta: ${usuarioActivo.cuentas[0].numeroCuenta}`;
    // Mostrar saldo
    this.mostrarSaldo();

    // Cuando el usuario cambia la cuenta seleccionada, actualizar la UI
    select.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      document.getElementById('accountNumber').innerText = `Cuenta: ${usuarioActivo.cuentas[idx].numeroCuenta}`;
      this.mostrarSaldo(idx);
      // limpiar panel de acción/resultados al cambiar cuenta
      document.getElementById('panelAccion').innerHTML = '';
      document.getElementById('resultado').innerText = '';
    });
  },

  /* Mostrar saldo de la cuenta seleccionada */
  mostrarSaldo(index = null) {
    const select = document.getElementById('cuentaActivaSelect');
    const idx = index !== null ? index : (select ? parseInt(select.value, 10) : 0);
    const cuenta = usuarioActivo.cuentas[idx];
    document.getElementById('resultado').innerText = `Saldo actual: $${cuenta.consultarSaldo()}`;
  },

  /* Mostrar movimientos de la cuenta seleccionada */
  mostrarMovimientos() {
    const select = document.getElementById('cuentaActivaSelect');
    const idx = select ? parseInt(select.value, 10) : 0;
    const cuenta = usuarioActivo.cuentas[idx];
    const movs = cuenta.consultarMovimientos();
    if (!movs.length) {
      document.getElementById('resultado').innerText = 'No hay movimientos aún.';
      return;
    }
    // Formatear movimientos para mostrar
    const lines = movs.map(m => `${m.fecha.split('T')[0]} — ${m.tipo}: $${m.monto}`).join('\n');
    document.getElementById('resultado').innerText = lines;
  },

  /* Ejecuta la acción seleccionada (deposito, retiro, transferencia) usando la cuenta activa en el selector */
  ejecutarAccion(tipo) {
    const select = document.getElementById('cuentaActivaSelect');
    const idx = select ? parseInt(select.value, 10) : 0;
    const monto = parseFloat(document.getElementById('monto').value);
    const cuenta = usuarioActivo.cuentas[idx];

    // Validaciones básicas
    if (isNaN(monto) || monto <= 0) {
      document.getElementById('resultado').innerText = 'Ingrese un monto válido.';
      return;
    }

    try {
      if (tipo === 'deposito') {
        cuenta.realizarDeposito(monto);syncUsuarioActivoToStorage();
        document.getElementById('resultado').innerText = '✅ Depósito exitoso';
      } else if (tipo === 'retiro'){
        "Deposito exitoso"
        cuenta.realizarRetiro(monto);syncUsuarioActivoToStorage();
        document.getElementById('resultado').innerText = '✅ Retiro exitoso';
      }
      else if (tipo === 'transferencia') {
        const destino = document.getElementById('destino').value.trim();
        if (!destino) {
          document.getElementById('resultado').innerText = 'Ingrese la cuenta destino.';
          return;
        }

        // Buscar cuenta destino en usuarios (objeto serializado en localStorage)
        let encontrado = false;
        for (let i = 0; i < usuarios.length; i++) {
          const u = usuarios[i];
          for (let j = 0; j < (u.cuentas || []).length; j++) {
            if (u.cuentas[j].numeroCuenta === destino) {
              // Reconstruir usuario destino como instancia, aplicar depósito y volver a serializar
              const usuarioDestino = reconstruirUsuario(u);
              usuarioDestino.cuentas[j].saldo += monto;
              usuarioDestino.cuentas[j].movimientos.unshift({
              tipo: 'Transferencia recibida',
              monto: monto,
              fecha: new Date().toISOString()
              });


              // Actualizar usuarios[i] con la versión serializada
              usuarios[i] = serializeCliente(usuarioDestino);

              // Proceder a retirar de la cuenta origen del usuario activo
              cuenta.realizarRetiro(monto);

              // Sincronizar cambios de ambos usuarios
              syncUsuarioActivoToStorage();
              localStorage.setItem('usuarios', JSON.stringify(usuarios));

              document.getElementById('resultado').innerText = '✅ Transferencia exitosa';
              encontrado = true;
              break;
            }
          }
          if (encontrado) break;
        }

        if (!encontrado) {alert('Cuenta destino no encontrada'); return;};
      }

      // Actualizar UI (saldo actualizado, selector con nuevos saldos)
      this.actualizarUI();
      // limpiar panel de acción
      document.getElementById('panelAccion').innerHTML = '';
    } catch (err) {
      document.getElementById('resultado').innerText = `⚠️ ${err.message}`;
    }
  }
};

/* =====================
   Inicializar la app cuando el DOM esté listo
   ===================== */
document.addEventListener('DOMContentLoaded', () => App.init());
