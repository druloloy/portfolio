import * as migration_20260912_095202_v3_schema from './20260912_095202_v3_schema';

export const migrations = [
  {
    up: migration_20260912_095202_v3_schema.up,
    down: migration_20260912_095202_v3_schema.down,
    name: '20260912_095202_v3_schema'
  },
];
