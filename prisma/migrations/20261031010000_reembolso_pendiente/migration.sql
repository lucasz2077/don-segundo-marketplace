-- Pago aprobado que hay que devolver y cuyo reembolso en Mercado Pago todavía
-- no se confirmó (p. ej. carrera por la última unidad, D4). El cron de pagos
-- reintenta el reembolso hasta pasarlo a REEMBOLSADO.
ALTER TYPE "CompraEstadoPago" ADD VALUE 'REEMBOLSO_PENDIENTE';
