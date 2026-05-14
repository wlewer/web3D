/**
 * 数据源引擎 - 根据 dataSource 配置自动获取数据
 * DataSourceEngine - Resolves data based on component dataSource config
 */
import type { DataSourceConfig, PageContext } from '../../types/template';

/**
 * 模板参数插值：将 {page}, {category} 等占位符替换为 context 中的实际值
 */
function interpolate(template: string, context: PageContext): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return String(
      context.params[key] ||
      context.query[key] ||
      ''
    );
  });
}

/**
 * 解析数据源
 */
export async function resolveDataSource(
  dataSource: DataSourceConfig | undefined,
  context: PageContext,
): Promise<unknown> {
  if (!dataSource) return null;

  switch (dataSource.type) {
    case 'api': {
      if (!dataSource.endpoint) return null;
      try {
        const url = interpolate(dataSource.endpoint, context);
        const resp = await fetch(url);
        if (!resp.ok) {
          console.warn(`DataSource API error: ${url} -> ${resp.status}`);
          return null;
        }
        return resp.json();
      } catch (err) {
        console.warn(`DataSource API failed: ${dataSource.endpoint}`, err);
        return null;
      }
    }

    case 'static':
      return dataSource.data ?? null;

    case 'context': {
      if (!dataSource.key) return null;
      const keys = dataSource.key.split('.');
      let value: unknown = context;
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[k];
        } else {
          return null;
        }
      }
      return value;
    }

    default:
      return null;
  }
}

/**
 * 同步解析静态/上下文数据源（用于初始化渲染）
 */
export function resolveDataSourceSync(
  dataSource: DataSourceConfig | undefined,
  context: PageContext,
): unknown {
  if (!dataSource) return null;

  switch (dataSource.type) {
    case 'static':
      return dataSource.data ?? null;
    case 'context': {
      if (!dataSource.key) return null;
      const keys = dataSource.key.split('.');
      let value: unknown = context;
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[k];
        } else {
          return null;
        }
      }
      return value;
    }
    default:
      return null;
  }
}
