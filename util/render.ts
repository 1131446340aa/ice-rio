export function render(path: string, config?: Record<string, any>) {
  return new RouterReturnType(path, (config = {}), 'render');
}

export class RouterReturnType {
  constructor(
    public path: string,
    public config: Record<string, any>,
    public type: string
  ) {}
}
