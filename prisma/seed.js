/**
 * Seed de base de datos.
 * Ejecutar desde la raíz del proyecto: node prisma/seed.js
 * (o npx prisma db seed si package.json tiene "prisma.seed").
 * DATABASE_URL en .env: "file:./lomadev.db" (ruta relativa a la carpeta prisma/, NO ./prisma/lomadev.db).
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de base de datos...')

  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'Administrador',
      email: 'admin@lomadev.com',
      role: 'admin',
      status: 'active'
    }
  })

  console.log('✅ Usuario admin creado:', {
    username: admin.username,
    email: admin.email,
    role: admin.role
  })

  // Crear usuario de ejemplo (empleado)
  const employeePassword = await bcrypt.hash('empleado123', 10)
  
  const employee = await prisma.user.upsert({
    where: { username: 'empleado' },
    update: {},
    create: {
      username: 'empleado',
      password: employeePassword,
      name: 'Empleado de Prueba',
      email: 'empleado@lomadev.com',
      role: 'employee',
      status: 'active'
    }
  })

  console.log('✅ Usuario empleado creado:', {
    username: employee.username,
    email: employee.email,
    role: employee.role
  })

  // Crear herramientas de ejemplo (upsert para no fallar si ya existen)
  const tools = await Promise.all([
    prisma.tool.upsert({
      where: { serialNumber: 'MIL-001-2026' },
      update: {},
      create: {
        name: 'Taladro Milwaukee M18',
        brand: 'Milwaukee',
        model: 'M18 FUEL',
        serialNumber: 'MIL-001-2026',
        category: 'Taladros',
        status: 'available',
        price: 299.99,
        cost: 200.00,
        notes: 'Taladro inalámbrico de alto rendimiento',
        createdBy: admin.id
      }
    }),
    prisma.tool.upsert({
      where: { serialNumber: 'DEW-002-2026' },
      update: {},
      create: {
        name: 'Sierra Circular DeWalt',
        brand: 'DeWalt',
        model: 'DCS570',
        serialNumber: 'DEW-002-2026',
        category: 'Sierras',
        status: 'available',
        price: 249.99,
        cost: 180.00,
        notes: 'Sierra circular compacta',
        createdBy: admin.id
      }
    })
  ])

  console.log(`✅ ${tools.length} herramientas de ejemplo creadas`)

  // Crear productos de ejemplo para POS (upsert para no fallar si ya existen)
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'PROD-001' },
      update: {},
      create: {
        sku: 'PROD-001',
        name: 'Destornillador Phillips',
        description: 'Destornillador de precisión',
        category: 'Herramientas Manuales',
        price: 15.99,
        cost: 8.00,
        stock: 50,
        minStock: 10,
        barcode: '7501234567890',
        active: true,
        createdBy: admin.id
      }
    }),
    prisma.product.upsert({
      where: { sku: 'PROD-002' },
      update: {},
      create: {
        sku: 'PROD-002',
        name: 'Cinta Métrica 5m',
        description: 'Cinta métrica profesional',
        category: 'Medición',
        price: 12.99,
        cost: 6.00,
        stock: 30,
        minStock: 5,
        barcode: '7501234567891',
        active: true,
        createdBy: admin.id
      }
    })
  ])

  console.log(`✅ ${products.length} productos de ejemplo creados`)

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('\n📝 Credenciales de acceso:')
  console.log('   Admin:')
  console.log('   - Usuario: admin')
  console.log('   - Contraseña: admin123')
  console.log('\n   Empleado:')
  console.log('   - Usuario: empleado')
  console.log('   - Contraseña: empleado123')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
