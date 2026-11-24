import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('people')
export class PersonEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  /** Sem espaços nas pontas e em minúsculas; índice único. */
  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text' })
  name: string;

  /** O @usuário, sem o `@`: gravado em minúsculas, obrigatório e único (LLD, "Dados"). */
  @Column({ type: 'text', unique: true })
  username: string;

  /** Cargo, telefone e status: opcionais, lidos pelo Perfil (F1-03) e escritos pela F1-07. */
  @Column({ type: 'text', name: 'job_title', nullable: true })
  jobTitle: string | null;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'text', name: 'status_text', nullable: true })
  statusText: string | null;

  @Column({ type: 'text', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'boolean', name: 'is_admin', default: false })
  isAdmin: boolean;

  @Column({ type: 'boolean', name: 'has_data_permission', default: false })
  hasDataPermission: boolean;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
