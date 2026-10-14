import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20261014120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "review" ADD COLUMN IF NOT EXISTS "translations" jsonb NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "review" DROP COLUMN IF EXISTS "translations";`);
  }
}
