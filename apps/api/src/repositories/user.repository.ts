import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../database/entities/user.entity'

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } })
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } })
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const user = this.repo.create({ email, passwordHash })
    return this.repo.save(user)
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.repo.update(userId, { passwordHash })
  }
}