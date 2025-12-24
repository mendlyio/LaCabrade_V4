-- Script SQL pour supprimer TOUS les produits
-- ⚠️  ATTENTION : Cette action est IRRÉVERSIBLE

BEGIN;

-- Supprimer les money_amount (prix)
DELETE FROM money_amount WHERE variant_id IN (SELECT id FROM product_variant);

-- Supprimer les inventory levels
DELETE FROM inventory_level WHERE inventory_item_id IN (
  SELECT inventory_item_id FROM product_variant_inventory_item
);

-- Supprimer les liens inventory items <-> variants
DELETE FROM product_variant_inventory_item;

-- Supprimer les inventory items
DELETE FROM inventory_item WHERE sku IN (SELECT sku FROM product_variant);

-- Supprimer les images de produits
DELETE FROM image WHERE id IN (SELECT image_id FROM product_images);
DELETE FROM product_images;

-- Supprimer les tags de produits
DELETE FROM product_tags;

-- Supprimer les catégories de produits
DELETE FROM product_category_product;

-- Supprimer les sales channels de produits
DELETE FROM product_sales_channel;

-- Supprimer les variants
DELETE FROM product_variant;

-- Supprimer les options
DELETE FROM product_option_value;
DELETE FROM product_option;

-- Supprimer les produits
DELETE FROM product;

-- Afficher le résultat
SELECT 'Tous les produits ont été supprimés' AS result;

COMMIT;

