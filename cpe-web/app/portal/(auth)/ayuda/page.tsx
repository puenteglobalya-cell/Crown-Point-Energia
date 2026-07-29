export const metadata = { title: 'Ayuda — Cambiar contraseña' }

export default function AyudaPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Cómo cambiar tu contraseña</h1>

      <h2 style={{ fontSize: 17, marginTop: 28 }}>Si ya tenés acceso al portal</h2>
      <ol>
        <li>Iniciá sesión y entrá a <a href="/portal/mi-cuenta"><strong>Mi Cuenta</strong></a>.</li>
        <li>Buscá la sección <strong>Cambiar contraseña</strong>.</li>
        <li>Completá Contraseña actual, Nueva contraseña y Confirmar contraseña.</li>
        <li>Usá el botón <strong>Mostrar</strong> / <strong>Ocultar</strong> al lado de cada campo si necesitás verificar lo que escribiste.</li>
        <li>Confirmá el cambio. La próxima vez que inicies sesión, usá la nueva contraseña.</li>
      </ol>

      <h2 style={{ fontSize: 17, marginTop: 28 }}>Si no podés entrar (olvidaste la contraseña o es tu primer ingreso)</h2>
      <ol>
        <li>En la pantalla de login, tocá <strong>¿Olvidaste tu contraseña?</strong></li>
        <li>Ingresá tu email y vas a recibir un correo con un enlace para restablecerla.</li>
        <li>Si sos un usuario invitado, vas a recibir un email de invitación con un enlace para crear tu contraseña por primera vez.</li>
        <li>Ese enlace te lleva a una pantalla donde definís tu nueva contraseña.</li>
      </ol>

      <h2 style={{ fontSize: 17, marginTop: 28 }}>Si el administrador te generó el acceso manualmente</h2>
      <p>
        Si recibís un enlace de acceso compartido directamente (por ejemplo, si el envío automático de correos falló),
        abrilo en el navegador. Vas a llegar a la pantalla de restablecer contraseña; definí tu nueva contraseña y confirmá.
        A partir de ahí ya podés usar Mi Cuenta para cambiarla cuando quieras.
      </p>

      <h2 style={{ fontSize: 17, marginTop: 28 }}>¿Problemas?</h2>
      <p>Si no te llega el email o el enlace no funciona, contactá al administrador del portal para que te genere un nuevo enlace de acceso.</p>
    </div>
  )
}
