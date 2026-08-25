import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm'

export class InitialSchema1725000000000 implements MigrationInterface {
  name = 'InitialSchema1725000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'password_hash', type: 'varchar' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    // sessions table
    await queryRunner.createTable(
      new Table({
        name: 'sessions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'token_hash', type: 'varchar', isUnique: true },
          { name: 'user_id', type: 'uuid' },
          { name: 'expires_at', type: 'timestamptz' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'sessions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({ name: 'IDX_sessions_user_id', columnNames: ['user_id'] }),
    )
    await queryRunner.createIndex(
      'sessions',
      new TableIndex({ name: 'IDX_sessions_expires_at', columnNames: ['expires_at'] }),
    )

    // reset_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'reset_tokens',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'token_hash', type: 'varchar', isUnique: true },
          { name: 'user_id', type: 'uuid' },
          { name: 'expires_at', type: 'timestamptz' },
          { name: 'used', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'reset_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createIndex(
      'reset_tokens',
      new TableIndex({ name: 'IDX_reset_tokens_user_id', columnNames: ['user_id'] }),
    )
    await queryRunner.createIndex(
      'reset_tokens',
      new TableIndex({ name: 'IDX_reset_tokens_expires_at', columnNames: ['expires_at'] }),
    )

    // cars table
    await queryRunner.createTable(
      new Table({
        name: 'cars',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar' },
          { name: 'category', type: 'varchar' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('cars', new TableIndex({ name: 'IDX_cars_category', columnNames: ['category'] }))

    // tracks table
    await queryRunner.createTable(
      new Table({
        name: 'tracks',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar' },
          { name: 'layout', type: 'varchar' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('tracks', new TableIndex({ name: 'IDX_tracks_name', columnNames: ['name'] }))

    // setups table
    await queryRunner.createTable(
      new Table({
        name: 'setups',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'user_id', type: 'uuid' },
          { name: 'car_id', type: 'uuid' },
          { name: 'track_id', type: 'uuid' },
          { name: 'condition', type: 'varchar' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'setups',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    )
    await queryRunner.createForeignKey(
      'setups',
      new TableForeignKey({
        columnNames: ['car_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cars',
        onDelete: 'RESTRICT',
      }),
    )
    await queryRunner.createForeignKey(
      'setups',
      new TableForeignKey({
        columnNames: ['track_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tracks',
        onDelete: 'RESTRICT',
      }),
    )

    await queryRunner.createUniqueConstraint(
      'setups',
      new TableUnique({ name: 'UQ_setups_user_car_track_condition', columnNames: ['user_id', 'car_id', 'track_id', 'condition'] }),
    )

    await queryRunner.createIndex('setups', new TableIndex({ name: 'IDX_setups_user_id', columnNames: ['user_id'] }))
    await queryRunner.createIndex('setups', new TableIndex({ name: 'IDX_setups_car_id', columnNames: ['car_id'] }))
    await queryRunner.createIndex('setups', new TableIndex({ name: 'IDX_setups_track_id', columnNames: ['track_id'] }))

    // setup_versions table
    await queryRunner.createTable(
      new Table({
        name: 'setup_versions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'setup_id', type: 'uuid' },
          { name: 'version_no', type: 'int' },
          { name: 'parent_version_no', type: 'int', isNullable: true },
          { name: 'sha256', type: 'varchar', length: '64' },
          { name: 'overlay', type: 'jsonb', isNullable: true },
          { name: 'file_ref', type: 'varchar', length: '500' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'setup_versions',
      new TableForeignKey({
        columnNames: ['setup_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'setups',
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createUniqueConstraint(
      'setup_versions',
      new TableUnique({ name: 'UQ_setup_versions_setup_version', columnNames: ['setup_id', 'version_no'] }),
    )

    await queryRunner.createIndex(
      'setup_versions',
      new TableIndex({ name: 'IDX_setup_versions_setup_id', columnNames: ['setup_id'] }),
    )
    await queryRunner.createIndex(
      'setup_versions',
      new TableIndex({ name: 'IDX_setup_versions_version_no', columnNames: ['version_no'] }),
    )

    // feedback_entries table
    await queryRunner.createTable(
      new Table({
        name: 'feedback_entries',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'user_id', type: 'uuid' },
          { name: 'setup_id', type: 'uuid' },
          { name: 'version_id', type: 'uuid' },
          { name: 'text', type: 'text' },
          { name: 'lap_delta_ms', type: 'int', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'feedback_entries',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    )
    await queryRunner.createForeignKey(
      'feedback_entries',
      new TableForeignKey({
        columnNames: ['setup_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'setups',
        onDelete: 'CASCADE',
      }),
    )
    await queryRunner.createForeignKey(
      'feedback_entries',
      new TableForeignKey({
        columnNames: ['version_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'setup_versions',
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createIndex(
      'feedback_entries',
      new TableIndex({ name: 'IDX_feedback_entries_user_id', columnNames: ['user_id'] }),
    )
    await queryRunner.createIndex(
      'feedback_entries',
      new TableIndex({ name: 'IDX_feedback_entries_setup_id', columnNames: ['setup_id'] }),
    )
    await queryRunner.createIndex(
      'feedback_entries',
      new TableIndex({ name: 'IDX_feedback_entries_version_id', columnNames: ['version_id'] }),
    )

    // tags table
    await queryRunner.createTable(
      new Table({
        name: 'tags',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar' },
          { name: 'user_id', type: 'uuid' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'tags',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createUniqueConstraint(
      'tags',
      new TableUnique({ name: 'UQ_tags_name_user', columnNames: ['name', 'user_id'] }),
    )

    // setup_tags table
    await queryRunner.createTable(
      new Table({
        name: 'setup_tags',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'setup_id', type: 'uuid' },
          { name: 'tag_id', type: 'uuid' },
          { name: 'user_id', type: 'uuid' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'setup_tags',
      new TableForeignKey({
        columnNames: ['setup_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'setups',
        onDelete: 'CASCADE',
      }),
    )
    await queryRunner.createForeignKey(
      'setup_tags',
      new TableForeignKey({
        columnNames: ['tag_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tags',
        onDelete: 'CASCADE',
      }),
    )
    await queryRunner.createForeignKey(
      'setup_tags',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createUniqueConstraint(
      'setup_tags',
      new TableUnique({ name: 'UQ_setup_tags_setup_tag', columnNames: ['setup_id', 'tag_id'] }),
    )

    await queryRunner.createIndex('setup_tags', new TableIndex({ name: 'IDX_setup_tags_setup_id', columnNames: ['setup_id'] }))
    await queryRunner.createIndex('setup_tags', new TableIndex({ name: 'IDX_setup_tags_tag_id', columnNames: ['tag_id'] }))
    await queryRunner.createIndex('setup_tags', new TableIndex({ name: 'IDX_setup_tags_user_id', columnNames: ['user_id'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('setup_tags')
    await queryRunner.dropTable('tags')
    await queryRunner.dropTable('feedback_entries')
    await queryRunner.dropTable('setup_versions')
    await queryRunner.dropTable('setups')
    await queryRunner.dropTable('tracks')
    await queryRunner.dropTable('cars')
    await queryRunner.dropTable('reset_tokens')
    await queryRunner.dropTable('sessions')
    await queryRunner.dropTable('users')
  }
}