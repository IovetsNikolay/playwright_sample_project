import { APIResponse } from 'playwright';
import { IApiContext } from '../types';
import { LoginRequest } from '../dto/UserDto';

export class LoginService {
  constructor(private readonly context: IApiContext) {}

  login(body: LoginRequest): Promise<APIResponse> {
    return this.context.post({ endpoint: '/users/login', body });
  }

  logout(): Promise<APIResponse> {
    return this.context.get({ endpoint: '/users/logout' });
  }

  refresh(): Promise<APIResponse> {
    return this.context.get({ endpoint: '/users/refresh' });
  }
}
