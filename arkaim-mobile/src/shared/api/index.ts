/**
 * Barrel для shared/api — единственная точка импорта.
 *
 * `client.ts` реализует HTTP-клиент (fetch + expo-secure-store).
 * Экспортируется напрямую, чтобы код мог писать:
 *   import { api } from '../shared/api';   (barrel)
 *   import { api } from '../shared/api/client';  (прямой путь)
 * Оба стиля типизированы.
 */
export * from './client';
