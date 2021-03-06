import { Identity, Message, Credential, Presentation, Claim } from 'daf-core'
import { In } from 'typeorm'
import Debug from 'debug'

const debug = Debug('daf:data-store')

export class DataStore {
  async findCredential(id: string) {
    const credential = await Credential.findOne(id, { relations: ['issuer', 'subject'] })
    return credential
  }

  async findCredentials({ iss, sub }: { iss?: string; sub?: string }) {
    let where

    if (iss && sub) {
      where = [{ issuer: iss }, { subject: sub }]
    } else {
      if (iss) where = { issuer: iss }
      if (sub) where = { subject: sub }
    }

    const credentials = await Credential.find({
      relations: ['issuer', 'subject'],
      where,
    })

    return credentials.map(this.credentialToLegacyFormat)
  }

  async credentialsForMessageId(id: string) {
    const message = await Message.findOne(id, {
      relations: ['credentials', 'credentials.issuer', 'credentials.subject'],
    })

    return message?.credentials.map(this.credentialToLegacyFormat)
  }

  async credentialsFieldsForClaimHash(hash: string) {
    const credential = new Credential()
    credential.hash = hash

    const claims = await Claim.find({
      relations: ['issuer', 'subject'],
      where: { credential },
    })

    return claims.map(claim => ({
      rowId: `${claim.hash}`,
      hash: claim.hash,
      parentHash: hash,
      iss: { did: claim.issuer.did },
      sub: { did: claim.subject.did },
      type: claim.type,
      value: claim.value,
      isObj: claim.isObj,
    }))
  }

  async findCredentialsByFields({
    iss,
    sub,
    claim_type,
  }: {
    iss?: string[]
    sub?: string[]
    claim_type: string
  }) {
    let where = {}

    if (iss?.length > 0) {
      where['issuer'] = In(iss)
    }
    if (sub?.length > 0) {
      where['subject'] = In(sub)
    }

    if (claim_type) {
      where['type'] = claim_type
    }

    const claims = await Claim.find({
      relations: ['credential', 'credential.issuer', 'credential.subject'],
      where,
    })

    return claims.map(claim => this.credentialToLegacyFormat(claim.credential))
  }

  credentialToLegacyFormat(credential: Credential) {
    return {
      rowId: `${credential.hash}`,
      hash: credential.hash,
      iss: { did: credential.issuer.did },
      sub: { did: credential.subject.did },
      jwt: credential.raw,
      nbf: credential.issuanceDate?.getTime() / 1000,
      exp: credential.expirationDate?.getTime() / 1000,
    }
  }

  async findMessages({
    sender,
    receiver,
    threadId,
    limit,
  }: {
    sender?: string
    receiver?: string
    threadId?: string
    limit?: number
  }) {
    let where = []

    if (threadId) {
      where.push({ threadId: threadId })
    }

    if (sender) {
      where.push({ from: sender })
    }

    if (receiver) {
      where.push({ to: receiver })
    }

    if (sender || receiver) {
      // SDR can have empty to field
      where.push({ to: null })
    }

    const messages = await Message.find({
      where,
      order: { saveDate: 'DESC' },
      relations: ['from', 'to'],
    })

    return messages.map(this.messageToLegacyFormat)
  }

  async findMessage(id: string) {
    const message = await Message.findOne(id, { relations: ['from', 'to'] })
    return this.messageToLegacyFormat(message)
  }

  async allIdentities() {
    const identities = await Identity.find()
    return identities.map(identity => ({ did: identity.did }))
  }

  async findIdentityByDid(did: string) {
    return { did }
  }

  async popularClaimForDid(did: string, claimType: string) {
    // This should be using public profile VP.
    // For MVP purposes we will return any claim
    const claim = await Claim.findOne({
      where: {
        subject: did,
        type: claimType,
      },
    })

    return claim?.value
  }

  async latestMessageTimestamps() {
    // FIXME
    return []
  }

  async shortId(did: string) {
    const name = await this.popularClaimForDid(did, 'name')
    if (name) {
      return name
    }
    const firstName = await this.popularClaimForDid(did, 'firstName')
    const lastName = await this.popularClaimForDid(did, 'lastName')
    let shortId = firstName
    shortId = lastName ? `${firstName && firstName + ' '}${lastName}` : shortId
    shortId = !shortId ? `${did.slice(0, 15)}...${did.slice(-4)}` : shortId
    return shortId
  }

  async saveMessage(message: Message) {
    await message.save()

    return { hash: message.id, iss: { did: message.from.did } }
  }

  async findMessagesByVC(hash: string) {
    const credential = await Credential.findOne(hash, {
      relations: ['messages', 'messages.from', 'messages.to'],
    })

    return credential.messages.map(this.messageToLegacyFormat)
  }

  async metaData(id: string) {
    const message = await Message.findOne(id)
    return message.metaData
  }

  async deleteMessage(id: string) {
    const message = new Message()
    message.id = id
    return await message.remove()
  }

  private messageToLegacyFormat(message: Message) {
    return {
      rowId: message.id,
      id: message.id,
      sender: message.from ? { did: message.from.did } : null,
      receiver: message.to ? { did: message.to.did } : null,
      type: message.type,
      threadId: message.threadId,
      data: JSON.stringify(message.data),
      raw: message.raw,
      timestamp: message.createdAt?.getTime() / 1000,
    }
  }
}
