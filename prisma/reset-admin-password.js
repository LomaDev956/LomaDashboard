/**
 * Restablece la contraseña del usuario admin en la base de datos.
 * Uso en el servidor: cd ~/loma-app && node prisma/reset-admin-password.js
 * (Asegúrate de tener DATABASE_URL en .env.local o .env)
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const NUEVA_PASSWORD = process.env.ADMIN_NEW_PASSWORD || 'admin123'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!user) {
    console.error('No existe usuario "admin" en la base de datos. Ejecuta antes: npx prisma db seed')
    process.exit(1)
  }
  const hash = await bcrypt.hash(NUEVA_PASSWORD, 10)
  await prisma.user.update({
    where: { username: 'admin' },
    data: { password: hash }
  })
  console.log('Contraseña de "admin" actualizada. Usa:', NUEVA_PASSWORD)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
