import { APIResponse } from 'playwright';
import { IApiContext } from '../types';
import {
  ProductRequest,
  PartialProductRequest,
  ProductResponse,
  PaginatedProductResponse,
  ProductListParams,
  ProductSearchParams,
  ProductSpecResponse,
  ProductSpecRequest,
} from '../dto/ProductDto';
import { step } from 'annotations/step';

export class ProductsService {
  constructor(private readonly context: IApiContext) {}

  @step()
  list(params?: ProductListParams): Promise<PaginatedProductResponse> {
    return this.context.get<PaginatedProductResponse>(
      { endpoint: '/products', queryParams: params as Record<string, string | number | boolean> },
      true,
    );
  }

  @step()
  getById(productId: string): Promise<ProductResponse> {
    return this.context.get<ProductResponse>({ endpoint: `/products/${productId}` }, true);
  }

  @step()
  create(body: ProductRequest): Promise<ProductResponse> {
    return this.context.post<ProductResponse>({ endpoint: '/products', body }, true);
  }

  @step()
  update(productId: string, body: ProductRequest): Promise<APIResponse> {
    return this.context.put({ endpoint: `/products/${productId}`, body });
  }

  @step()
  patch(productId: string, body: PartialProductRequest): Promise<APIResponse> {
    return this.context.patch({ endpoint: `/products/${productId}`, body });
  }

  @step()
  delete(productId: string): Promise<APIResponse> {
    return this.context.delete({ endpoint: `/products/${productId}` });
  }

  @step()
  search(params: ProductSearchParams): Promise<PaginatedProductResponse> {
    return this.context.get<PaginatedProductResponse>(
      { endpoint: '/products/search', queryParams: params as Record<string, string | number | boolean> },
      true,
    );
  }

  @step()
  getRelated(productId: string): Promise<ProductResponse[]> {
    return this.context.get<ProductResponse[]>({ endpoint: `/products/${productId}/related` }, true);
  }

  @step()
  getSpecs(productId: string): Promise<ProductSpecResponse[]> {
    return this.context.get<ProductSpecResponse[]>({ endpoint: `/products/${productId}/specs` }, true);
  }

  @step()
  getSpec(productId: string, specId: string): Promise<ProductSpecResponse> {
    return this.context.get<ProductSpecResponse>(
      { endpoint: `/products/${productId}/specs/${specId}` },
      true,
    );
  }

  @step()
  addSpec(productId: string, body: ProductSpecRequest): Promise<ProductSpecResponse> {
    return this.context.post<ProductSpecResponse>({ endpoint: `/products/${productId}/specs`, body }, true);
  }

  @step()
  updateSpec(productId: string, specId: string, body: Partial<ProductSpecRequest>): Promise<APIResponse> {
    return this.context.put({ endpoint: `/products/${productId}/specs/${specId}`, body });
  }

  @step()
  deleteSpec(productId: string, specId: string): Promise<APIResponse> {
    return this.context.delete({ endpoint: `/products/${productId}/specs/${specId}` });
  }
}
