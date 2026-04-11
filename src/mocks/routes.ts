/**
 * Mock process-route data: Product → ordered Operation[].
 *
 * Each product has a sequence of operations representing its fab process flow.
 * The order in the array is the process order (index 0 = first operation).
 */

export interface RouteOperation {
  /** Unique within the product route, e.g. "A7-Litho:Lot start" */
  id: string;
  /** Human-readable operation name */
  name: string;
  /** 0-based position in the route */
  order: number;
}

export interface ProductRoute {
  product: string;
  operations: RouteOperation[];
}

function makeRoute(product: string, ops: string[]): ProductRoute {
  return {
    product,
    operations: ops.map((name, i) => ({
      id: `${product}:${name}`,
      name,
      order: i,
    })),
  };
}

export const PRODUCT_ROUTES: ProductRoute[] = [
  makeRoute('A7-Litho', [
    'Lot start',
    'Wafer transfer',
    'Chamber pump-down',
    'Recipe step 3',
    'Endpoint detect',
    'Vent cycle',
  ]),
  makeRoute('B3-Etch', [
    'Lot start',
    'Chamber pump-down',
    'Process clean',
    'Recipe step 3',
    'Endpoint detect',
    'Vent cycle',
  ]),
  makeRoute('C2-CVD', [
    'Lot start',
    'Wafer transfer',
    'Chamber pump-down',
    'Process clean',
    'Recipe step 3',
    'Idle / standby',
  ]),
  makeRoute('D1-PVD', [
    'Lot start',
    'Wafer transfer',
    'Chamber pump-down',
    'Process clean',
    'Endpoint detect',
    'Vent cycle',
  ]),
  makeRoute('E5-CMP', [
    'Lot start',
    'Wafer transfer',
    'Process clean',
    'Recipe step 3',
    'Idle / standby',
    'Vent cycle',
  ]),
  makeRoute('F4-Metro', [
    'Lot start',
    'Wafer transfer',
    'Chamber pump-down',
    'Recipe step 3',
    'Endpoint detect',
    'Vent cycle',
  ]),
];

/** Lookup a product's route by product name. */
export function getProductRoute(product: string): ProductRoute | undefined {
  return PRODUCT_ROUTES.find((r) => r.product === product);
}
