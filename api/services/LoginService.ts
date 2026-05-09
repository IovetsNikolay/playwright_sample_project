import { APIResponse } from 'playwright';
import { IApiContext } from '../types';
import { LoginRequest } from '../dto/UserDto';
import { step } from 'annotations/step';

export class LoginService {
  constructor(private readonly context: IApiContext) {}

  @step()
  login(body: LoginRequest): Promise<APIResponse> {
    return this.context.post({ endpoint: '/users/login', body });
  }

  @step()
  logout(): Promise<APIResponse> {
    return this.context.get({ endpoint: '/users/logout' });
  }

  @step()
  refresh(): Promise<APIResponse> {
    return this.context.get({ endpoint: '/users/refresh' });
  }
}
