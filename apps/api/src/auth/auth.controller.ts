import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { AuthGuard } from './auth.guard'
import { registerSchema } from './dto/register.dto'
import { loginSchema } from './dto/login.dto'
import { recoverSchema } from './dto/recover.dto'
import { resetSchema } from './dto/reset.dto'
import { ZodValidationPipe } from '../pipes/zod-validation.pipe'

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  async register(@Body(new ZodValidationPipe(registerSchema)) body: { email: string; password: string }) {
    const user = await this.authService.register(body.email, body.password)
    return { userId: user.id, email: user.email }
  }

  @Post('login')
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  async login(@Body(new ZodValidationPipe(loginSchema)) body: { email: string; password: string }) {
    const { token, user } = await this.authService.login(body.email, body.password)
    return { sessionToken: token, userId: user.id, email: user.email }
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (token) {
      await this.authService.logout(token)
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: any) {
    return { userId: req.user.id, email: req.user.email }
  }

  @Post('recover')
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async recover(@Body(new ZodValidationPipe(recoverSchema)) body: { email: string }) {
    await this.authService.requestPasswordReset(body.email)
  }

  @Post('reset')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(@Body(new ZodValidationPipe(resetSchema)) body: { token: string; password: string }) {
    await this.authService.confirmPasswordReset(body.token, body.password)
  }
}