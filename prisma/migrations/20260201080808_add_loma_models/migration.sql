-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "File_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "price" REAL,
    "cost" REAL,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tool_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Warranty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "toolId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "purchaseDate" DATETIME NOT NULL,
    "warrantyExpiry" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Warranty_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" REAL NOT NULL,
    "cost" REAL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "barcode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "total" REAL NOT NULL,
    "customerName" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LomaHerramienta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "catNo" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "precio" REAL,
    "falla" TEXT,
    "anosGarantia" INTEGER,
    "fechaVencimientoGarantia" TEXT,
    "fotos" TEXT NOT NULL DEFAULT '[]',
    "estado" TEXT NOT NULL DEFAULT 'Operativa',
    "condicion" TEXT NOT NULL DEFAULT 'Nueva',
    "fechaAgregado" TEXT NOT NULL,
    "fechaVenta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LomaListaGarantia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombreLista" TEXT NOT NULL,
    "articulos" TEXT NOT NULL DEFAULT '[]',
    "personalId" TEXT,
    "fechaCreacion" TEXT NOT NULL,
    "fechaEnvio" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'En Preparación',
    "notas" TEXT,
    "trackingIda" TEXT,
    "trackingVenida" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LomaPersonal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "codigoPostal" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "milwaukeeUser" TEXT,
    "milwaukeePassword" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "File_uploadedBy_idx" ON "File"("uploadedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_serialNumber_key" ON "Tool"("serialNumber");

-- CreateIndex
CREATE INDEX "Tool_serialNumber_idx" ON "Tool"("serialNumber");

-- CreateIndex
CREATE INDEX "Tool_status_idx" ON "Tool"("status");

-- CreateIndex
CREATE INDEX "Tool_createdBy_idx" ON "Tool"("createdBy");

-- CreateIndex
CREATE INDEX "Warranty_toolId_idx" ON "Warranty"("toolId");

-- CreateIndex
CREATE INDEX "Warranty_status_idx" ON "Warranty"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "Sale_productId_idx" ON "Sale"("productId");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "LomaHerramienta_catNo_idx" ON "LomaHerramienta"("catNo");

-- CreateIndex
CREATE INDEX "LomaHerramienta_estado_idx" ON "LomaHerramienta"("estado");

-- CreateIndex
CREATE INDEX "LomaHerramienta_serialNumber_idx" ON "LomaHerramienta"("serialNumber");

-- CreateIndex
CREATE INDEX "LomaHerramienta_fechaAgregado_idx" ON "LomaHerramienta"("fechaAgregado");

-- CreateIndex
CREATE UNIQUE INDEX "LomaListaGarantia_nombreLista_key" ON "LomaListaGarantia"("nombreLista");

-- CreateIndex
CREATE INDEX "LomaListaGarantia_estado_idx" ON "LomaListaGarantia"("estado");

-- CreateIndex
CREATE INDEX "LomaListaGarantia_personalId_idx" ON "LomaListaGarantia"("personalId");

-- CreateIndex
CREATE INDEX "LomaListaGarantia_fechaCreacion_idx" ON "LomaListaGarantia"("fechaCreacion");

-- CreateIndex
CREATE UNIQUE INDEX "LomaPersonal_email_key" ON "LomaPersonal"("email");

-- CreateIndex
CREATE INDEX "LomaPersonal_email_idx" ON "LomaPersonal"("email");

-- CreateIndex
CREATE INDEX "LomaPersonal_status_idx" ON "LomaPersonal"("status");
