// classes.js
// Contiene la lógica de negocio (POO): Cliente, Cuenta, CuentaAhorros, CuentaCorriente
// Todas las clases están documentadas y sus métodos cumplen los requisitos del enunciado.

/**
 * Clase Cliente
 * Representa a un usuario del sistema con sus datos personales y cuentas asociadas.
 * Atributos: nombre, apellido, direccion, numeroIdentificacion, usuario, contrasena, cuentas[]
 */
class Cliente {
  /**
   * @param {string} nombre
   * @param {string} apellido
   * @param {string} direccion
   * @param {string} numeroIdentificacion
   * @param {string} usuario
   * @param {string} contrasena
   */
  constructor(nombre, apellido,correo, telefono, direccion, numeroIdentificacion, usuario, contrasena) {
    this.nombre = nombre;
    this.apellido = apellido;
    this.correo = correo;
    this.telefono = telefono;
    this.direccion = direccion;
    this.numeroIdentificacion = numeroIdentificacion;
    this.usuario = usuario;
    this.contrasena = contrasena;
    this.cuentas = []; // array de instancias de Cuenta (Ahorros / Corriente)
  }

  // Agrega una cuenta (CuentaAhorros o CuentaCorriente)
  agregarCuenta(cuenta) {
    this.cuentas.push(cuenta);
  }

  // Consulta el saldo de una cuenta específica (por índice)
  consultarSaldo(index = 0) {
    if (!this.cuentas[index]){alert('Cuenta no encontrada'); return;}
    return this.cuentas[index].consultarSaldo();
  }

  // Realiza un depósito en la cuenta indicada
  realizarDeposito(index = 0, monto) {
    if (!this.cuentas[index]) {alert('Cuenta no encontrada'); return;};
    return this.cuentas[index].realizarDeposito(monto);
  }

  // Realiza un retiro en la cuenta indicada (la lógica de sobregiro depende de la subclase)
  realizarRetiro(index = 0, monto) {
    if (!this.cuentas[index]) {alert('Cuenta no encontrada'); return;};
    this.cuentas[index].realizarRetiro(monto);
  }

  // Retorna el historial de movimientos de la cuenta indicada
  consultarMovimientos(index = 0) {
    if (!this.cuentas[index]) {alert('Cuenta no encontrada'); return;}
    return this.cuentas[index].consultarMovimientos();
  }
}

/**
 * Clase Cuenta (superclase)
 * Atributos: numeroCuenta, saldo, movimientos[]
 * Métodos: consultarSaldo, realizarDeposito, realizarRetiro (debe implementarse en subclases), consultarMovimientos
 */
class Cuenta {
  constructor(numeroCuenta, saldo = 0) {
    this.numeroCuenta = numeroCuenta;
    this.saldo = saldo;
    this.movimientos = []; // cada movimiento: { tipo, monto, fecha }
  }

  // Devuelve el saldo actual
  consultarSaldo() {
    return this.saldo;
  }

  // Deposita una cantidad y registra el movimiento
  realizarDeposito(monto) {
    if (typeof monto !== 'number' || monto <= 0) {alert('El monto debe ser mayor a 0'); return;};
    this.saldo += monto;
    this.movimientos.unshift({ tipo: 'Depósito', monto: monto, fecha: new Date().toISOString() });
  }

  // Método base para retiro: se deja intencionalmente para que las subclases lo implementen
  realizarRetiro(monto) {
    alert('realizarRetiro debe implementarse en la subclase');
    return;
  }

  // Devuelve el arreglo de movimientos
  consultarMovimientos() {
    return this.movimientos;
  }
}

/**
 * CuentaAhorros
 * No permite sobregiros. Implementa realizarRetiro respetando saldo disponible.
 */
class CuentaAhorros extends Cuenta {
  constructor(numeroCuenta, saldo = 0) {
    super(numeroCuenta, saldo);
  }

  // Retiro sin sobregiro
  realizarRetiro(monto) {
    if (typeof monto !== 'number' || monto <= 0) {alert('El monto debe ser mayor a 0'); return;};
    if (monto <= this.saldo) {
      this.saldo -= monto;
      this.movimientos.unshift({ tipo: 'Retiro', monto: monto, fecha: new Date().toISOString() });
    } else {
      alert('No se permite sobregiro en Cuenta Ahorros');
      return;
    }
  }
}

/**
 * CuentaCorriente
 * Permite sobregiro hasta un límite (por defecto 500000).
 */
class CuentaCorriente extends Cuenta {
  constructor(numeroCuenta, saldo = 0, limiteSobregiro = 500000) {
    super(numeroCuenta, saldo);
    this.limiteSobregiro = limiteSobregiro;
  }

  // Retiro que puede usar sobregiro hasta el límite
  realizarRetiro(monto) {
    if (typeof monto !== 'number' || monto <= 0) {alert('El monto debe ser mayor a 0'); return;};
    if (monto <= this.saldo + this.limiteSobregiro) {
      this.saldo -= monto;
      this.movimientos.unshift({ tipo: 'Retiro (corriente)', monto: monto, fecha: new Date().toISOString() });
    } else {
      alert('Límite de sobregiro excedido en Cuenta Corriente');
      return;
    }
  }
}

// Exportar al objeto global para facilitar la creación de instancias desde app.js
window.__Bank = { Cliente, Cuenta, CuentaAhorros, CuentaCorriente };
