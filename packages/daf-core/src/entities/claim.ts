import {
  Entity,
  Column,
  BaseEntity,
  ManyToOne,
  JoinTable,
  PrimaryColumn,
  OneToMany,
  ManyToMany,
  BeforeInsert,
} from 'typeorm'
import { Identity } from './identity'
import { Credential } from './credential'

@Entity()
export class Claim extends BaseEntity {
  @PrimaryColumn()
  hash: string

  @ManyToOne(
    type => Identity,
    identity => identity.issuedPresentations,
  )
  issuer: Identity

  @ManyToOne(
    type => Identity,
    identity => identity.receivedPresentations,
  )
  subject: Identity

  @ManyToOne(
    type => Credential,
    credential => credential.claims,
  )
  credential: Credential

  @Column()
  type: string

  @Column()
  value: string

  @Column()
  isObj: boolean
}
