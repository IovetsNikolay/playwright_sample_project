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

export class ProductsService {
  constructor(private readonly context: IApiContext) {}

  list(params?: ProductListParams): Promise<PaginatedProductResponse> {
    return this.context.get<PaginatedProductResponse>(
      { endpoint: '/products', queryParams: params as Record<string, string | number | boolean> },
      true,
    );
  }

  getById(productId: string): Promise<ProductResponse> {
    return this.context.get<ProductResponse>({ endpoint: `/products/${productId}` }, true);
  }

  create(body: ProductRequest): Promise<ProductResponse> {
    return this.context.post<ProductResponse>({ endpoint: '/products', body }, true);
  }

  update(productId: string, body: ProductRequest): Promise<APIResponse> {
    return this.context.put({ endpoint: `/products/${productId}`, body });
  }

  patch(productId: string, body: PartialProductRequest): Promise<APIResponse> {
    return this.context.patch({ endpoint: `/products/${productId}`, body });
  }

  delete(productId: string): Promise<APIResponse> {
    return this.context.delete({ endpoint: `/products/${productId}` });
  }

  search(params: ProductSearchParams): Promise<PaginatedProductResponse> {
    return this.context.get<PaginatedProductResponse>(
      { endpoint: '/products/search', queryParams: params as Record<string, string | number | boolean> },
      true,
    );
  }

  getRelated(productId: string): Promise<ProductResponse[]> {
    return this.context.get<ProductResponse[]>({ endpoint: `/products/${productId}/related` }, true);
  }

  getSpecs(productId: string): Promise<ProductSpecResponse[]> {
    return this.context.get<ProductSpecResponse[]>({ endpoint: `/products/${productId}/specs` }, true);
  }

  getSpec(productId: string, specId: string): Promise<ProductSpecResponse> {
    return this.context.get<ProductSpecResponse>(
      { endpoint: `/products/${productId}/specs/${specId}` },
      true,
    );
  }

  addSpec(productId: string, body: ProductSpecRequest): Promise<ProductSpecResponse> {
    return this.context.post<ProductSpecResponse>({ endpoint: `/products/${productId}/specs`, body }, true);
  }

  updateSpec(productId: string, specId: string, body: Partial<ProductSpecRequest>): Promise<APIResponse> {
    return this.context.put({ endpoint: `/products/${productId}/specs/${specId}`, body });
  }

  deleteSpec(productId: string, specId: string): Promise<APIResponse> {
    return this.context.delete({ endpoint: `/products/${productId}/specs/${specId}` });
  }
}
