import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthGuard } from './auth.guard'
import { registerSchema } from './dto/register.dto'
import { loginSchema } from './dto/login.dto'
import { recoverSchema } from './dto/recover.dto'
import { resetSchema } from './dto/reset.dto'
import { ZodValidationPipe } from '../pipes/zod-validation.pipe'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body(new ZodValidationPipe(registerSchema)) body: { email: string; password: string }) {
    const user = await this.authService.register(body.email, body.password)
    return { user }
  }

  @Post('login')
  async login(@Body(new ZodValidationPipe(loginSchema)) body: { email: string; password: string }) {
    const token = await this.authService.login(body.email, body.password)
    return { token }
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
    return { user: { id: req.user.id, email: req.user.email } }
  }

  @Post('recover')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recover(@Body(new ZodValidationPipe(recoverSchema)) body: { email: string }) {
    await this.authService.requestPasswordReset(body.email)
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(@Body(new ZodValidationPipe(resetSchema)) body: { token: string; password: string }) {
    await this.authService.confirmPasswordReset(body.token, body.password)
  }
}